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
import type { HotelConPrecio } from "@/app/api/hoteles/route";
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
import SelectorMoneda from "@/components/SelectorMoneda";
import Precio from "@/components/Precio";
import { useMoneda } from "@/components/MonedaContext";
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

export default function Portada({ modoInterno }: { modoInterno: boolean }) {
  const { moneda, setMoneda } = useMoneda();
  const [pestana, setPestana] = useState<"vuelos" | "hoteles" | "paquetes">("vuelos");
  const [estado, setEstado] = useState<Estado>({ fase: "inicio" });
  const [estadoHoteles, setEstadoHoteles] = useState<EstadoHoteles>({
    fase: "inicio",
  });
  const [ultimoHotel, setUltimoHotel] = useState<ParametrosHotel | null>(null);
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
      setEstado({ fase: "reservando", oferta: cuerpo.oferta });
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
                  className={`rounded-full px-4 py-1.5 text-sm font-medium ${
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
                  {opcion === "vuelos"
                    ? "Vuelos"
                    : opcion === "hoteles"
                      ? "Hoteles"
                      : "Paquetes"}
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
                  Consultando aerolíneas en vivo… puede tardar hasta 30
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
              <div className="mt-6 grid grid-cols-1 gap-8">
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-[#0B2545]">
                    ✈️ Vuelos
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
                    onElegir={(oferta) => setEstado({ fase: "reservando", oferta })}
                    onElegirCombinacion={elegirCombinacion}
                  />
                </div>

                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-[#0B2545]">
                    🏨 Hoteles en tu destino
                  </h2>
                  {estadoHoteles.fase === "inicio" && ultimaBusqueda?.destino && (
                    <p className="text-sm text-[#5A6B80]">
                      Busca vuelos y te mostraremos hoteles disponibles en{" "}
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
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
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
              Consultando aerolíneas en vivo… puede tardar hasta 30 segundos.
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

        {(pestana === "vuelos" || pestana === "paquetes") &&
          estado.fase === "reservando" && (
            <FormularioReserva
              mostrarMargen={modoInterno}
              oferta={estado.oferta}
              onCancelar={() => ultimaBusqueda && buscar(ultimaBusqueda)}
              onReservada={(resultado) =>
                setEstado({ fase: "confirmada", resultado })
              }
            />
          )}

        {(pestana === "vuelos" || pestana === "paquetes") &&
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
    </div>
  );
}
