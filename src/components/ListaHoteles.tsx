"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import Precio from "@/components/Precio";
import type { FichaHotel } from "@/app/api/hoteles/[hotelId]/route";
import type { HotelConPrecio } from "@/app/api/hoteles/route";
import { emparejarHabitacion } from "@/lib/habitaciones";
import DetalleHotel from "@/components/DetalleHotel";
import Bandera from "@/components/Bandera";

type Orden = "precio" | "calificacion" | "estrellas" | "nombre";

interface Props {
  hoteles: HotelConPrecio[];
  mostrarMargen: boolean;
}

export default function ListaHoteles({ hoteles, mostrarMargen }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<string | null>(null);
  const [fichas, setFichas] = useState<Record<string, FichaHotel>>({});
  const [cargandoFicha, setCargandoFicha] = useState<string | null>(null);
  const [errorFicha, setErrorFicha] = useState<string | null>(null);
  const [orden, setOrden] = useState<Orden>("precio");
  const [estrellasMinimas, setEstrellasMinimas] = useState(0);
  const [calificacionMinima, setCalificacionMinima] = useState(0);
  const [soloReembolsable, setSoloReembolsable] = useState(false);
  const [precioMaximo, setPrecioMaximo] = useState<number | null>(null);
  const [texto, setTexto] = useState("");
  const [visibles, setVisibles] = useState(12);

  const moneda = hoteles[0]?.moneda ?? "USD";
  const topePrecio = useMemo(
    () =>
      hoteles.length > 0
        ? Math.ceil(Math.max(...hoteles.map((h) => h.desde)))
        : 0,
    [hoteles],
  );

  async function cargarFicha(hotelId: string) {
    if (fichas[hotelId]) return;
    setCargandoFicha(hotelId);
    setErrorFicha(null);
    try {
      const respuesta = await fetch(`/api/hoteles/${hotelId}`);
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setErrorFicha(cuerpo.error ?? "No se pudo cargar la ficha del hotel");
        return;
      }
      setFichas((previas) => ({ ...previas, [hotelId]: cuerpo as FichaHotel }));
    } catch (error) {
      setErrorFicha((error as Error).message);
    } finally {
      setCargandoFicha(null);
    }
  }

  const filtrados = useMemo(() => {
    const busqueda = texto.trim().toLocaleLowerCase();
    const lista = hoteles.filter((hotel) => {
      if ((hotel.estrellas ?? 0) < estrellasMinimas) return false;
      if ((hotel.calificacion ?? 0) < calificacionMinima) return false;
      if (precioMaximo !== null && hotel.desde > precioMaximo) return false;
      if (
        soloReembolsable &&
        !hotel.habitaciones.some((h) => h.reembolsable === true)
      ) {
        return false;
      }
      if (
        busqueda !== "" &&
        !hotel.nombre.toLocaleLowerCase().includes(busqueda)
      )
        return false;
      return true;
    });
    return [...lista].sort((a, b) => {
      if (orden === "calificacion")
        return (b.calificacion ?? 0) - (a.calificacion ?? 0);
      if (orden === "estrellas") return (b.estrellas ?? 0) - (a.estrellas ?? 0);
      if (orden === "nombre") return a.nombre.localeCompare(b.nombre, "es");
      return a.desde - b.desde;
    });
  }, [
    hoteles,
    texto,
    estrellasMinimas,
    calificacionMinima,
    precioMaximo,
    soloReembolsable,
    orden,
  ]);

  if (hoteles.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-[#5A6B80] shadow">
        No hay hoteles disponibles con esos datos.
      </p>
    );
  }

  const hotelDetalle =
    hoteles.find((hotel) => hotel.hotelId === detalle) ?? null;

  return (
    <div>
      <div className="flex flex-col gap-3 rounded-xl border border-[#E4E8EE] bg-white p-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-40 flex-1 flex-col text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
          Buscar por nombre
          <input
            className="mt-1 rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm font-normal normal-case text-[#0B2545]"
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Hilton, ibis, resort…"
            value={texto}
          />
        </label>

        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
          Ordenar por
          <select
            className="mt-1 rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm font-normal normal-case text-[#0B2545]"
            onChange={(e) => setOrden(e.target.value as Orden)}
            value={orden}
          >
            <option value="precio">Precio más bajo</option>
            <option value="calificacion">Mejor calificados</option>
            <option value="estrellas">Más estrellas</option>
            <option value="nombre">Nombre (A–Z)</option>
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
          Estrellas mínimas
          <select
            className="mt-1 rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm font-normal normal-case text-[#0B2545]"
            onChange={(e) => setEstrellasMinimas(Number(e.target.value))}
            value={estrellasMinimas}
          >
            <option value={0}>Cualquiera</option>
            <option value={3}>3★ o más</option>
            <option value={4}>4★ o más</option>
            <option value={5}>5★</option>
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
          Calificación mínima
          <select
            className="mt-1 rounded-lg border border-[#E4E8EE] px-3 py-2 text-sm font-normal normal-case text-[#0B2545]"
            onChange={(e) => setCalificacionMinima(Number(e.target.value))}
            value={calificacionMinima}
          >
            <option value={0}>Cualquiera</option>
            <option value={6}>6+ aceptable</option>
            <option value={7}>7+ bueno</option>
            <option value={8}>8+ muy bueno</option>
            <option value={9}>9+ excelente</option>
          </select>
        </label>

        <label className="flex flex-col text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
          Precio máximo por estancia
          <input
            className="mt-1 w-40"
            max={topePrecio}
            min={0}
            onChange={(e) => setPrecioMaximo(Number(e.target.value))}
            step={10}
            type="range"
            value={precioMaximo ?? topePrecio}
          />
          <span className="text-xs font-normal normal-case text-[#0B2545]">
            hasta <Precio moneda={moneda} monto={precioMaximo ?? topePrecio} />
          </span>
        </label>

        <label className="flex items-center gap-2 text-sm text-[#0B2545]">
          <input
            checked={soloReembolsable}
            onChange={(e) => setSoloReembolsable(e.target.checked)}
            type="checkbox"
          />
          Sólo con cancelación gratis
        </label>

        <button
          className="text-xs text-[#14477E] underline"
          onClick={() => {
            setTexto("");
            setOrden("precio");
            setEstrellasMinimas(0);
            setCalificacionMinima(0);
            setPrecioMaximo(null);
            setSoloReembolsable(false);
          }}
          type="button"
        >
          Limpiar filtros
        </button>
      </div>

      <p className="mt-3 text-sm text-[#5A6B80]">
        {filtrados.length} de {hoteles.length} hoteles cumplen tus filtros
      </p>

      {filtrados.length === 0 ? (
        <p className="mt-3 rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm text-[#5A6B80]">
          Ningún hotel cumple esos filtros. Suelta alguno para ver más opciones.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {filtrados.slice(0, visibles).map((hotel) => {
            const desplegado = abierto === hotel.hotelId;
            const ficha = fichas[hotel.hotelId] ?? null;
            return (
              <article
                className="overflow-hidden rounded-xl bg-white shadow shadow-[#0B2545]/10"
                key={hotel.hotelId}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row">
                  {hotel.foto && (
                    <button
                      className="shrink-0"
                      onClick={() => {
                        setDetalle(hotel.hotelId);
                        void cargarFicha(hotel.hotelId);
                      }}
                      type="button"
                    >
                      <Image
                        alt={hotel.nombre}
                        className="h-40 w-full rounded-lg object-cover sm:h-28 sm:w-40"
                        height={160}
                        src={hotel.foto}
                        unoptimized
                        width={240}
                      />
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[#0B2545]">
                      {hotel.nombre}
                      {hotel.estrellas
                        ? ` · ${"★".repeat(Math.round(hotel.estrellas))}`
                        : ""}
                    </h3>
                    <p className="text-xs text-[#5A6B80]">
                      {[hotel.direccion, hotel.ciudad, hotel.pais]
                        .filter(Boolean)
                        .join(" · ")}{" "}
                      <Bandera bandera={hotel.bandera} />
                    </p>
                    {hotel.calificacion !== null && (
                      <p className="text-xs text-[#5A6B80]">
                        Calificación {hotel.calificacion}/10
                        {hotel.resenas ? ` · ${hotel.resenas} reseñas` : ""}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-[#5A6B80]">
                      {hotel.habitaciones.length} tarifa
                      {hotel.habitaciones.length === 1 ? "" : "s"} ·{" "}
                      {hotel.noches} noche
                      {hotel.noches === 1 ? "" : "s"}
                    </p>
                    <button
                      className="mt-2 text-xs font-medium text-[#14477E] underline"
                      onClick={() => {
                        setDetalle(hotel.hotelId);
                        void cargarFicha(hotel.hotelId);
                      }}
                      type="button"
                    >
                      Ver hotel: fotos, servicios, ubicación y opiniones
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[#5A6B80]">
                      Desde
                    </p>
                    <p className="text-xl font-bold text-[#0B2545]">
                      <Precio moneda={hotel.moneda} monto={hotel.desde} />
                    </p>
                    <button
                      className="mt-2 rounded-lg bg-[#F0A400] px-4 py-2 text-sm font-semibold text-[#0B2545]"
                      onClick={() => {
                        setAbierto(desplegado ? null : hotel.hotelId);
                        if (!desplegado) void cargarFicha(hotel.hotelId);
                      }}
                      type="button"
                    >
                      {desplegado ? "Ocultar tarifas" : "Ver tarifas"}
                    </button>
                  </div>
                </div>

                {desplegado && (
                  <ul className="divide-y divide-[#E4E8EE] border-t border-[#E4E8EE] bg-[#F9FAFC]">
                    {hotel.habitaciones.map((habitacion) => {
                      const catalogo = emparejarHabitacion(
                        habitacion.habitacion,
                        ficha?.habitaciones,
                      );
                      const foto =
                        catalogo?.fotos[0] ??
                        ficha?.fotosHabitaciones[0] ??
                        null;
                      return (
                        <li
                          className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                          key={habitacion.ofertaId}
                        >
                          {foto ? (
                            <Image
                              alt={habitacion.habitacion}
                              className="h-28 w-full rounded-md object-cover sm:h-16 sm:w-24"
                              height={112}
                              src={foto}
                              unoptimized
                              width={160}
                            />
                          ) : (
                            cargandoFicha === hotel.hotelId && (
                              <div className="h-16 w-24 shrink-0 animate-pulse rounded-md bg-[#E4E8EE]" />
                            )
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[#0B2545]">
                              {habitacion.habitacion}
                            </p>
                            <p className="text-xs text-[#5A6B80]">
                              {[
                                habitacion.regimen,
                                habitacion.reembolsable === null
                                  ? null
                                  : habitacion.reembolsable
                                    ? `reembolsable${habitacion.cancelaAntesDe ? ` hasta ${habitacion.cancelaAntesDe}` : ""}`
                                    : "no reembolsable",
                                catalogo?.metros
                                  ? `${catalogo.metros} m²`
                                  : null,
                                catalogo?.camas[0] ?? null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                            {habitacion.impuestosNoIncluidos.length > 0 && (
                              <p className="text-xs text-[#B4451F]">
                                Se paga en el hotel:{" "}
                                {habitacion.impuestosNoIncluidos.map((i, idx) => (
                                  <span key={idx}>
                                    {idx > 0 ? ", " : ""}
                                    {i.descripcion}{" "}
                                    <Precio moneda={hotel.moneda} monto={i.monto} />
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold text-[#0B2545]">
                              <Precio
                                moneda={hotel.moneda}
                                monto={habitacion.precioVenta}
                              />
                            </p>
                            {mostrarMargen && (
                              <p className="text-xs text-[#5A6B80]">
                                neto{" "}
                                <Precio
                                  moneda={hotel.moneda}
                                  monto={habitacion.costoNeto}
                                />{" "}
                                + markup{" "}
                                <Precio
                                  moneda={hotel.moneda}
                                  monto={habitacion.markup}
                                />
                              </p>
                            )}
                            {habitacion.precioReferencia !== null && (
                              <p className="text-xs text-[#5A6B80]">
                                referencia {habitacion.fuenteReferencia ?? ""}{" "}
                                <Precio
                                  moneda={hotel.moneda}
                                  monto={habitacion.precioReferencia}
                                />
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}

      {filtrados.length > visibles && (
        <button
          className="mt-4 w-full rounded-lg border border-[#14477E] px-4 py-2.5 text-sm font-semibold text-[#14477E]"
          onClick={() => setVisibles((v) => v + 12)}
          type="button"
        >
          Ver más hoteles ({filtrados.length - visibles} restantes)
        </button>
      )}

      {hotelDetalle && (
        <DetalleHotel
          cargando={cargandoFicha === hotelDetalle.hotelId}
          error={errorFicha}
          ficha={fichas[hotelDetalle.hotelId] ?? null}
          hotel={hotelDetalle}
          mostrarMargen={mostrarMargen}
          onCerrar={() => {
            setDetalle(null);
            setErrorFicha(null);
          }}
        />
      )}
    </div>
  );
}
