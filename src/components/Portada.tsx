"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  AerolineaResumen,
  CombinacionTramos,
  OfertaConPrecio,
  OpcionTramo,
} from "@/app/api/buscar/route";
import type { OpcionCiudad } from "@/app/api/ciudades/route";
import type {
  HotelConPrecio,
  HabitacionConPrecio,
} from "@/app/api/hoteles/route";
import Buscador, { type ParametrosFormulario } from "@/components/Buscador";
import BuscadorHoteles, {
  type ParametrosHotel,
} from "@/components/BuscadorHoteles";
import ListaHoteles from "@/components/ListaHoteles";
import HistorialBusquedas from "@/components/HistorialBusquedas";
import ListaOfertas from "@/components/ListaOfertas";
import FormularioReserva, {
  type ResultadoReserva,
} from "@/components/FormularioReserva";
import ResumenVuelo from "@/components/ResumenVuelo";
import SelectorMoneda from "@/components/SelectorMoneda";
import Precio from "@/components/Precio";
import { useMoneda } from "@/components/MonedaContext";
import { useAuth } from "@/components/AuthContext";
import AuthModal from "@/components/AuthModal";
import { TicketsPlane, Building2, Briefcase, User, LogOut } from "lucide-react";
import {
  borrarHistorial,
  guardarBusqueda,
  historialDelNavegador,
  historialDelServidor,
  suscribirHistorial,
} from "@/lib/historial";

type Estado =
  | { fase: "inicio" }
  | { fase: "buscando" }
  | {
      fase: "resultados";
      ofertas: OfertaConPrecio[];
      total: number;
      busquedaId: string | null;
      tramosBuscados: number;
      opcionesTramo: OpcionTramo[];
      combinaciones: CombinacionTramos[];
      aerolineasCombinaciones: Record<string, AerolineaResumen>;
    }
  | { fase: "reservando"; oferta: OfertaConPrecio }
  | { fase: "confirmada"; resultado: ResultadoReserva };

type EstadoHoteles =
  | { fase: "inicio" }
  | { fase: "buscando" }
  | {
      fase: "resultados";
      hoteles: HotelConPrecio[];
      total: number;
      ambiente: string;
      mensaje?: string;
    };

type Paquete =
  | { paso: 1 }
  | { paso: 2; vuelo: OfertaConPrecio }
  | { paso: 3; vuelo: OfertaConPrecio; hotel: HotelConPrecio; habitacion: HabitacionConPrecio };

export default function Portada({ modoInterno }: { modoInterno: boolean }) {
  const { moneda, setMoneda } = useMoneda();
  const { usuario, cargando: cargandoAuth, cerrarSesion } = useAuth();
  const [modalAuth, setModalAuth] = useState(false);
  const [pestana, setPestana] = useState<"vuelos" | "hoteles" | "paquetes">("vuelos");
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [estadoHoteles, setEstadoHoteles] = useState<EstadoHoteles>({
    fase: "inicio",
  });
  const [ultimoHotel, setUltimoHotel] = useState<ParametrosHotel | null>(null);
  const [paquete, setPaquete] = useState<Paquete>({ paso: 1 });
  const [error, setError] = useState<string | null>(null);
  const [resolviendo, setResolviendo] = useState(false);
  const [ultimaBusqueda, setUltimaBusqueda] =
    useState<ParametrosFormulario | null>(null);
  // Cada búsqueda aplicada remonta el formulario, incluso si repite los mismos datos.
  const [aplicaciones, setAplicaciones] = useState(0);
  const hotelBuscadoPara = useRef<string | null>(null);
  const historial = useSyncExternalStore(
    suscribirHistorial,
    historialDelNavegador,
    historialDelServidor,
  );

  async function buscar(parametros: ParametrosFormulario) {
    setError(null);
    setUltimaBusqueda(parametros);
    setAplicaciones((n) => n + 1);
    guardarBusqueda(parametros);
    setEstado({ fase: "buscando" });
    if (pestana === "paquetes") {
      hotelBuscadoPara.current = null;
      setEstadoHoteles({ fase: "inicio" });
      setPaquete({ paso: 1 });
    }
    try {
      const respuesta = await fetch("/api/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parametros),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo completar la búsqueda");
        setEstado({ fase: "inicio" });
        return;
      }
      setEstado({
        fase: "resultados",
        ofertas: cuerpo.ofertas,
        total: cuerpo.total,
        busquedaId: cuerpo.busquedaId ?? null,
        tramosBuscados: cuerpo.tramosBuscados ?? 1,
        opcionesTramo: cuerpo.opcionesTramo ?? [],
        combinaciones: cuerpo.combinaciones ?? [],
        aerolineasCombinaciones: cuerpo.aerolineasCombinaciones ?? {},
      });
    } catch (e) {
      setError((e as Error).message);
      setEstado({ fase: "inicio" });
    }
  }

  /** El viaje armado tramo por tramo puede caer en una oferta que no se mostró: se resuelve aquí. */
  async function elegirCombinacion(ofertaId: string) {
    if (estado.fase !== "resultados") return;
    setError(null);
    setResolviendo(true);
    try {
      const respuesta = await fetch("/api/oferta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ofertaId, busquedaId: estado.busquedaId }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo tomar esa combinación");
        return;
      }
      if (pestana === "paquetes") {
        setPaquete({ paso: 2, vuelo: cuerpo.oferta as OfertaConPrecio });
      } else {
        setEstado({ fase: "reservando", oferta: cuerpo.oferta });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setResolviendo(false);
    }
  }

  const buscarHotel = useCallback(async (parametros: ParametrosHotel) => {
    setError(null);
    setUltimoHotel(parametros);
    setEstadoHoteles({ fase: "buscando" });
    try {
      const respuesta = await fetch("/api/hoteles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parametros),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo buscar hoteles");
        setEstadoHoteles({ fase: "inicio" });
        return;
      }
      setEstadoHoteles({
        fase: "resultados",
        hoteles: cuerpo.hoteles,
        total: cuerpo.total,
        ambiente: cuerpo.ambiente,
        mensaje: cuerpo.mensaje,
      });
    } catch (e) {
      setError((e as Error).message);
      setEstadoHoteles({ fase: "inicio" });
    }
  }, []);

  useEffect(() => {
    if (pestana !== "paquetes") return;
    if (estado.fase !== "resultados") return;
    if (!ultimaBusqueda) return;
    if (estadoHoteles.fase === "buscando") return;

    const busqueda = ultimaBusqueda;
    const clave = `${busqueda.destino}-${busqueda.fechaSalida}-${busqueda.fechaRegreso ?? ""}-${moneda}-${busqueda.adultos}-${busqueda.menores.join(",")}`;
    if (hotelBuscadoPara.current === clave) return;
    hotelBuscadoPara.current = clave;

    if (!busqueda.fechaRegreso) {
      setEstadoHoteles({ fase: "inicio" });
      return;
    }

    async function buscarHotelesDestino() {
      const consulta =
        busqueda.destinoCiudad ?? busqueda.destinoNombre ?? busqueda.destino;
      try {
        const respuesta = await fetch(
          `/api/ciudades?q=${encodeURIComponent(consulta)}`,
        );
        if (!respuesta.ok) {
          setEstadoHoteles({ fase: "inicio" });
          return;
        }
        const cuerpo = (await respuesta.json()) as { opciones?: OpcionCiudad[] };
        const opcion = cuerpo.opciones?.[0];
        if (!opcion) {
          setEstadoHoteles({ fase: "inicio" });
          return;
        }
        buscarHotel({
          placeId: opcion.placeId,
          destino: opcion.nombre,
          pais: opcion.pais,
          entrada: busqueda.fechaSalida,
          salida: busqueda.fechaRegreso,
          adultos: busqueda.adultos,
          menores: busqueda.menores,
          moneda,
          nacionalidad: "MX",
        });
      } catch {
        setEstadoHoteles({ fase: "inicio" });
      }
    }

    buscarHotelesDestino();
  }, [pestana, estado.fase, ultimaBusqueda, moneda, estadoHoteles.fase, buscarHotel]);

  async function guardarReserva(datos: {
    pasajeros: { titulo: string; nombre: string; apellido: string; fechaNacimiento: string; genero: string }[];
    email: string;
    telefono: string;
  }) {
    if (paquete.paso !== 3) throw new Error("No hay paquete seleccionado");
    const { vuelo, hotel, habitacion } = paquete;
    const tramoIda = vuelo.tramos[0];
    const tramoVuelta = vuelo.tramos[vuelo.tramos.length - 1];
    const fechaSalida = tramoIda.segmentos[0].sale.slice(0, 10);
    const ultimoSegmento = tramoVuelta.segmentos[tramoVuelta.segmentos.length - 1];
    const fechaRegreso = ultimoSegmento.llega.slice(0, 10);
    const pasajeroPrincipal = datos.pasajeros[0] ?? { nombre: "", apellido: "" };
    const nombresPasajeros = datos.pasajeros
      .map((p) => `${p.nombre} ${p.apellido}`.trim())
      .filter(Boolean)
      .join(" · ");
    const bloques = [
      {
        posicion: 0,
        tipo: "vuelo",
        titulo: `Vuelo ${vuelo.aerolinea} ${tramoIda.origen} → ${tramoVuelta.destino}`,
        fecha: fechaSalida,
        fecha_fin: fechaRegreso,
        detalle: `${tramoIda.origen} → ${tramoVuelta.destino} · ${vuelo.tramos.length === 2 ? "ida y vuelta" : vuelo.tramos.length + " tramos"}`,
        proveedor: vuelo.aerolinea,
        costo_neto: vuelo.costoNeto,
        precio_venta: vuelo.precioVenta,
        cotizacion_id: vuelo.cotizacionId ? parseInt(vuelo.cotizacionId, 10) : null,
        datos: { oferta: vuelo, pasajeros: datos.pasajeros },
      },
      {
        posicion: 1,
        tipo: "hotel",
        titulo: `Hotel ${hotel.nombre}`,
        fecha: ultimaBusqueda?.fechaSalida ?? fechaSalida,
        fecha_fin: ultimaBusqueda?.fechaRegreso ?? fechaSalida,
        detalle: `${habitacion.habitacion} · ${hotel.noches} noches`,
        proveedor: "liteAPI",
        costo_neto: habitacion.costoNeto,
        precio_venta: habitacion.precioVenta,
        cotizacion_id: null,
        datos: { hotel, habitacion },
      },
    ];
    const respuesta = await fetch("/api/itinerarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: `Paquete ${tramoIda.origen} → ${tramoVuelta.destino}`,
        cliente: `${pasajeroPrincipal.nombre} ${pasajeroPrincipal.apellido}`.trim() || datos.email,
        resumen: `${nombresPasajeros || datos.email} · ${datos.telefono}`,
        moneda: vuelo.moneda,
        estado: "borrador",
        bloques,
      }),
    });
    const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
    if (!respuesta.ok || !cuerpo.id) {
      throw new Error(cuerpo.error ?? "No se pudo guardar la reserva");
    }
    return cuerpo.id;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[#F5F7FA]">
      <header className="bg-[#0B2545]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="IA Travel Planning" className="h-9" src="/logo.svg" />
          <div className="flex items-center gap-4">
            <SelectorMoneda
              className="w-40"
              etiqueta=""
              placeholder=""
              valor={moneda}
              onCambio={(nuevo) => setMoneda(nuevo ?? "USD")}
            />
            <nav className="flex items-center gap-4 text-sm text-white/80">
              <Link
                className="hover:text-white"
                href="/admin/itinerarios"
                prefetch={false}
              >
                Itinerarios
              </Link>
              <Link
                className="hover:text-white"
                href="/admin/markup"
                prefetch={false}
              >
                Markup
              </Link>
              {!cargandoAuth &&
                (usuario ? (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {usuario.nombre ?? usuario.email}
                    </span>
                    <button
                      className="inline-flex items-center gap-1 text-white/80 hover:text-white"
                      onClick={() => void cerrarSesion()}
                      type="button"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    className="inline-flex items-center gap-1 hover:text-white"
                    onClick={() => setModalAuth(true)}
                    type="button"
                  >
                    <User className="h-4 w-4" /> Entrar
                  </button>
                ))}
            </nav>
          </div>
        </div>
      </header>

      <section className="bg-[#0B2545] pb-16 pt-2 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {pestana === "vuelos"
                ? "Vuelos con tarifas en tiempo real"
                : pestana === "hoteles"
                  ? "Hoteles con tarifas en tiempo real"
                  : "Paquetes vuelo + hotel"}
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {pestana === "vuelos"
                ? "Más de 300 aerolíneas · precio final con impuestos · sin cargos escondidos"
                : pestana === "hoteles"
                  ? "Inventario de liteAPI · precio por estancia completa · políticas de cancelación reales"
                  : "Combina tu vuelo y hotel en una sola búsqueda"}
            </p>
            <div className="mt-4 flex gap-2">
              {(["vuelos", "hoteles", "paquetes"] as const).map((opcion) => (
                <button
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${
                    pestana === opcion
                      ? "bg-white text-[#0B2545]"
                      : "bg-white/15 text-white"
                  }`}
                  key={opcion}
                  onClick={() => {
                    setError(null);
                    setPestana(opcion);
                  }}
                  type="button"
                >
                  {opcion === "vuelos" ? (
                    <>
                      <TicketsPlane className="h-4 w-4" /> Vuelos
                    </>
                  ) : opcion === "hoteles" ? (
                    <>
                      <Building2 className="h-4 w-4" /> Hoteles
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4" /> Paquetes
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto -mt-10 w-full max-w-7xl flex-1 px-4 pb-16 sm:px-6">
        {pestana === "hoteles" && (
          <>
            <div className="relative z-10">
              <BuscadorHoteles
                cargando={estadoHoteles.fase === "buscando"}
                valoresIniciales={ultimoHotel}
                onBuscar={buscarHotel}
              />
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {estadoHoteles.fase === "buscando" && (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm text-[#5A6B80]">
                  Consultando hoteles en vivo…
                </p>
                {[0, 1, 2].map((n) => (
                  <div
                    className="h-32 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                    key={n}
                  />
                ))}
              </div>
            )}

            {estadoHoteles.fase === "resultados" && (
              <div className="mt-6">
                {estadoHoteles.total === 0 ? (
                  <div className="rounded-xl border border-[#E4E8EE] bg-white p-6 text-center">
                    <p className="text-base font-medium text-[#0B2545]">
                      No hay hoteles disponibles
                    </p>
                    <p className="mt-1 text-sm text-[#5A6B80]">
                      {estadoHoteles.mensaje ??
                        "Prueba con otras fechas o destino."}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-sm text-[#5A6B80]">
                      {estadoHoteles.total} hotel
                      {estadoHoteles.total === 1 ? "" : "es"} con disponibilidad
                      {ultimoHotel ? ` en ${ultimoHotel.destino}` : ""}
                      {estadoHoteles.ambiente === "sandbox"
                        ? " · inventario de prueba (sandbox): no reserva hoteles reales"
                        : ""}
                    </p>
                    <ListaHoteles
                      hoteles={estadoHoteles.hoteles}
                      mostrarMargen={modoInterno}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}

        {pestana === "paquetes" && (
          <>
            <div className="relative z-10">
              <Buscador
                cargando={estado.fase === "buscando"}
                key={`formulario-paquetes-${aplicaciones}`}
                valoresIniciales={ultimaBusqueda}
                onBuscar={buscar}
              />
            </div>

            {pestana === "paquetes" && error && (
              <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            {pestana === "paquetes" &&
              (estado.fase === "inicio" || estado.fase === "resultados") && (
                <div className="mt-4">
                  <HistorialBusquedas
                    historial={historial}
                    onBorrar={borrarHistorial}
                    onRepetir={buscar}
                  />
                </div>
              )}

            {pestana === "paquetes" && estado.fase === "buscando" && (
              <div className="mt-6 flex flex-col gap-3">
                <p className="text-sm text-[#5A6B80]">
                  Consultando aerolíneas en vivo… puede tardar hasta 20
                  segundos.
                </p>
                {[0, 1, 2, 3].map((n) => (
                  <div
                    className="h-28 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                    key={n}
                  />
                ))}
              </div>
            )}

            {pestana === "paquetes" && estado.fase === "resultados" && (
              <div className="mt-6 space-y-6">
                {paquete.paso === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#0B2545]">
                      <TicketsPlane className="mr-1 inline h-5 w-5" />
                      Paso 1: Elige tu vuelo
                    </h2>
                    <ListaOfertas
                      aerolineasCombinaciones={estado.aerolineasCombinaciones}
                      combinaciones={estado.combinaciones}
                      mostrarMargen={modoInterno}
                      ofertas={estado.ofertas}
                      opcionesTramo={estado.opcionesTramo}
                      resolviendo={resolviendo}
                      total={estado.total}
                      tramosBuscados={estado.tramosBuscados}
                      onElegir={(oferta) =>
                        setPaquete({ paso: 2, vuelo: oferta })
                      }
                      onElegirCombinacion={elegirCombinacion}
                    />
                  </div>
                )}

                {"vuelo" in paquete && paquete.vuelo && (
                  <>
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-[#0B2545]">
                        Vuelo elegido
                      </h2>
                      <button
                        className="text-sm text-[#14477E] underline"
                        onClick={() => setPaquete({ paso: 1 })}
                        type="button"
                      >
                        Cambiar vuelo
                      </button>
                    </div>
                    <ResumenVuelo
                      mostrarMargen={modoInterno}
                      oferta={paquete.vuelo}
                    />
                  </>
                )}

                {paquete.paso === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#0B2545]">
                      <Building2 className="mr-1 inline h-5 w-5" />
                      Paso 2: Elige tu hotel
                    </h2>
                    {estadoHoteles.fase === "inicio" && ultimaBusqueda?.destino && (
                      <p className="text-sm text-[#5A6B80]">
                        Buscando hoteles disponibles en{" "}
                        {ultimaBusqueda.destinoNombre ?? ultimaBusqueda.destino}.
                      </p>
                    )}
                    {estadoHoteles.fase === "buscando" && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-[#5A6B80]">
                          Consultando hoteles en vivo…
                        </p>
                        {[0, 1, 2].map((n) => (
                          <div
                            className="h-32 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                            key={n}
                          />
                        ))}
                      </div>
                    )}
                    {estadoHoteles.fase === "resultados" && (
                      <div>
                        {estadoHoteles.total === 0 ? (
                          <div className="rounded-xl border border-[#E4E8EE] bg-white p-6 text-center">
                            <p className="text-base font-medium text-[#0B2545]">
                              No hay hoteles disponibles
                            </p>
                            <p className="mt-1 text-sm text-[#5A6B80]">
                              {estadoHoteles.mensaje ??
                                "Prueba con otras fechas o destino."}
                            </p>
                          </div>
                        ) : (
                          <>
                            <p className="mb-3 text-sm text-[#5A6B80]">
                              {estadoHoteles.total} hotel
                              {estadoHoteles.total === 1 ? "" : "es"} con
                              disponibilidad
                              {ultimoHotel ? ` en ${ultimoHotel.destino}` : ""}
                              {estadoHoteles.ambiente === "sandbox"
                                ? " · inventario de prueba (sandbox): no reserva hoteles reales"
                                : ""}
                            </p>
                            <ListaHoteles
                              hoteles={estadoHoteles.hoteles}
                              mostrarMargen={modoInterno}
                              onElegir={(hotel, habitacion) =>
                                setPaquete({
                                  paso: 3,
                                  vuelo: paquete.vuelo!,
                                  hotel,
                                  habitacion,
                                })
                              }
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div className={pestana === "vuelos" ? "relative z-10" : "hidden"}>
          <Buscador
            cargando={estado.fase === "buscando"}
            key={`formulario-${aplicaciones}`}
            valoresIniciales={ultimaBusqueda}
            onBuscar={buscar}
          />
        </div>

        {pestana === "vuelos" &&
          (estado.fase === "inicio" || estado.fase === "resultados") && (
            <HistorialBusquedas
              historial={historial}
              onBorrar={borrarHistorial}
              onRepetir={buscar}
            />
          )}

        {pestana === "vuelos" && error && (
          <p className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {pestana === "vuelos" && estado.fase === "buscando" && (
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-sm text-[#5A6B80]">
              Consultando aerolíneas en vivo… puede tardar hasta 20 segundos.
            </p>
            {[0, 1, 2, 3].map((n) => (
              <div
                className="h-28 animate-pulse rounded-xl border border-[#E4E8EE] bg-white"
                key={n}
              />
            ))}
          </div>
        )}

        {pestana === "vuelos" && estado.fase === "resultados" && (
          <ListaOfertas
            aerolineasCombinaciones={estado.aerolineasCombinaciones}
            combinaciones={estado.combinaciones}
            mostrarMargen={modoInterno}
            ofertas={estado.ofertas}
            opcionesTramo={estado.opcionesTramo}
            resolviendo={resolviendo}
            total={estado.total}
            tramosBuscados={estado.tramosBuscados}
            onElegir={(oferta) => setEstado({ fase: "reservando", oferta })}
            onElegirCombinacion={elegirCombinacion}
          />
        )}

        {pestana === "vuelos" && estado.fase === "reservando" && (
          <FormularioReserva
            mostrarMargen={modoInterno}
            oferta={estado.oferta}
            onCancelar={() => ultimaBusqueda && buscar(ultimaBusqueda)}
            onReservada={(resultado) =>
              setEstado({ fase: "confirmada", resultado })
            }
          />
        )}

        {pestana === "paquetes" && paquete.paso === 3 && (
          <FormularioReserva
            habitacion={paquete.habitacion}
            hotel={paquete.hotel}
            mostrarMargen={modoInterno}
            oferta={paquete.vuelo}
            onCancelar={() =>
              setPaquete((p) =>
                "vuelo" in p
                  ? { paso: 2, vuelo: p.vuelo }
                  : { paso: 1 }
              )
            }
            onGuardar={guardarReserva}
            onReservada={(resultado) =>
              setEstado({ fase: "confirmada", resultado })
            }
          />
        )}

        {(pestana === "vuelos" ||
          (pestana === "paquetes" && estado.fase === "confirmada")) &&
          estado.fase === "confirmada" && (
          <section className="mt-8 rounded-xl border border-green-300 bg-green-50 p-6">
            <h2 className="text-lg font-semibold text-green-900">
              Reserva confirmada
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <dt className="text-[#5A6B80]">Clave de reserva (PNR)</dt>
              <dd className="font-mono font-semibold">
                {estado.resultado.pnr}
              </dd>
              <dt className="text-[#5A6B80]">Ambiente</dt>
              <dd>{estado.resultado.ambiente}</dd>
              <dt className="text-[#5A6B80]">Costo neto</dt>
              <dd>
                <Precio monto={estado.resultado.costoNeto} moneda={estado.resultado.moneda} />
              </dd>
              <dt className="text-[#5A6B80]">Markup</dt>
              <dd>
                <Precio monto={estado.resultado.markup} moneda={estado.resultado.moneda} />
              </dd>
              <dt className="text-[#5A6B80]">Precio de venta</dt>
              <dd className="font-semibold">
                <Precio monto={estado.resultado.precioVenta} moneda={estado.resultado.moneda} />
              </dd>
            </dl>
            <button
              className="mt-6 rounded-lg bg-[#0B2545] px-4 py-2 text-sm text-white"
              onClick={() => setEstado({ fase: "inicio" })}
              type="button"
            >
              Nueva búsqueda
            </button>
          </section>
        )}
      </main>

      <footer className="mt-auto bg-[#0B2545] text-white/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>IA Travel Planning · Moises Mejlachowicz</p>
          <p>
            Tarifas y disponibilidad en tiempo real · los precios cambian sin
            aviso
          </p>
        </div>
      </footer>

      <AuthModal abierto={modalAuth} onCerrar={() => setModalAuth(false)} />
    </div>
  );
}
