"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FichaHotel } from "@/app/api/hoteles/[hotelId]/route";
import type { HotelConPrecio } from "@/app/api/hoteles/route";

interface Props {
  hotel: HotelConPrecio;
  ficha: FichaHotel | null;
  cargando: boolean;
  error: string | null;
  mostrarMargen: boolean;
  onCerrar: () => void;
}

function dinero(monto: number, moneda: string): string {
  return `${moneda} ${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DetalleHotel({
  hotel,
  ficha,
  cargando,
  error,
  mostrarMargen,
  onCerrar,
}: Props) {
  const [fotoGrande, setFotoGrande] = useState(0);

  useEffect(() => {
    function escape(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCerrar]);

  const fotos = ficha?.fotos.length
    ? ficha.fotos
    : hotel.foto
      ? [hotel.foto]
      : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0B2545]/70 p-2 sm:p-6">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-xl border-b border-[#E4E8EE] bg-white px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-[#0B2545]">
              {hotel.nombre}
              {hotel.estrellas
                ? ` · ${"★".repeat(Math.round(hotel.estrellas))}`
                : ""}
            </h2>
            <p className="text-xs text-[#5A6B80]">
              {[ficha?.direccion ?? hotel.direccion, hotel.ciudad, hotel.pais]
                .filter(Boolean)
                .join(" · ")}{" "}
              {hotel.bandera}
            </p>
          </div>
          <button
            aria-label="Cerrar detalle del hotel"
            className="shrink-0 rounded-full border border-[#E4E8EE] px-3 py-1 text-sm text-[#0B2545]"
            onClick={onCerrar}
            type="button"
          >
            Cerrar
          </button>
        </div>

        <div className="px-4 pb-6">
          {fotos.length > 0 && (
            <div className="mt-3">
              <Image
                alt={hotel.nombre}
                className="h-56 w-full rounded-lg object-cover sm:h-80"
                height={640}
                src={fotos[Math.min(fotoGrande, fotos.length - 1)]}
                unoptimized
                width={1024}
              />
              {fotos.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {fotos.map((foto, indice) => (
                    <button
                      className={`shrink-0 overflow-hidden rounded-md border-2 ${
                        indice === fotoGrande
                          ? "border-[#14477E]"
                          : "border-transparent"
                      }`}
                      key={foto}
                      onClick={() => setFotoGrande(indice)}
                      type="button"
                    >
                      <Image
                        alt={`Foto ${indice + 1} de ${hotel.nombre}`}
                        className="h-16 w-24 object-cover"
                        height={64}
                        src={foto}
                        unoptimized
                        width={96}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {cargando && (
            <p className="mt-4 text-sm text-[#5A6B80]">
              Cargando la ficha del hotel…
            </p>
          )}
          {error && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {ficha && (
            <>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-[#F5F7FA] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Estancia
                  </p>
                  <p className="text-[#0B2545]">
                    {hotel.noches} noche{hotel.noches === 1 ? "" : "s"} · desde{" "}
                    {dinero(hotel.desde, hotel.moneda)}
                  </p>
                  <p className="text-xs text-[#5A6B80]">
                    Entrada desde {ficha.entrada ?? "no informado"} · salida
                    hasta {ficha.salida ?? "no informado"}
                  </p>
                </div>
                <div className="rounded-lg bg-[#F5F7FA] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Huéspedes
                  </p>
                  <p className="text-xs text-[#5A6B80]">
                    {ficha.calificacion !== null
                      ? `Calificación ${ficha.calificacion}/10${ficha.resenas ? ` · ${ficha.resenas} reseñas` : ""}`
                      : "Sin calificación publicada"}
                  </p>
                  <p className="text-xs text-[#5A6B80]">
                    {ficha.admiteMenores === false
                      ? "No admite menores · "
                      : ""}
                    {ficha.admiteMascotas === true
                      ? "Admite mascotas"
                      : "No admite mascotas"}
                    {ficha.estacionamiento
                      ? ` · estacionamiento ${ficha.estacionamiento}`
                      : ""}
                  </p>
                </div>
              </div>

              {ficha.categorias.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {ficha.categorias.map((categoria) => (
                    <span
                      className="rounded-full bg-[#E4E8EE] px-3 py-1 text-xs text-[#0B2545]"
                      key={categoria.nombre}
                    >
                      {categoria.nombre} {categoria.calificacion.toFixed(1)}
                    </span>
                  ))}
                </div>
              )}

              {(ficha.puntosFuertes.length > 0 ||
                ficha.puntosDebiles.length > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {ficha.puntosFuertes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                        Lo que gusta
                      </p>
                      <ul className="mt-1 list-inside list-disc text-sm text-[#0B2545]">
                        {ficha.puntosFuertes.map((punto) => (
                          <li key={punto}>{punto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {ficha.puntosDebiles.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                        Quejas frecuentes
                      </p>
                      <ul className="mt-1 list-inside list-disc text-sm text-[#B4451F]">
                        {ficha.puntosDebiles.map((punto) => (
                          <li key={punto}>{punto}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {ficha.descripcion && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Sobre el hotel
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-[#0B2545]">
                    {ficha.descripcion}
                  </p>
                </div>
              )}

              {ficha.servicios.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Servicios del hotel
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ficha.servicios.map((servicio) => (
                      <span
                        className="rounded-md bg-[#F5F7FA] px-2 py-1 text-xs text-[#0B2545]"
                        key={servicio}
                      >
                        {servicio}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {ficha.latitud !== null && ficha.longitud !== null && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Ubicación
                  </p>
                  <iframe
                    className="mt-1 h-56 w-full rounded-lg border border-[#E4E8EE]"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${ficha.longitud - 0.01}%2C${ficha.latitud - 0.008}%2C${ficha.longitud + 0.01}%2C${ficha.latitud + 0.008}&layer=mapnik&marker=${ficha.latitud}%2C${ficha.longitud}`}
                    title={`Mapa de ${hotel.nombre}`}
                  />
                  <a
                    className="mt-1 inline-block text-xs text-[#14477E] underline"
                    href={`https://www.google.com/maps/search/?api=1&query=${ficha.latitud},${ficha.longitud}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Abrir en Google Maps
                  </a>
                </div>
              )}

              {ficha.informacionImportante && (
                <div className="mt-4 rounded-lg border border-[#F0A400]/40 bg-[#FFF6E0] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8A6A00]">
                    Información importante del hotel
                  </p>
                  <p className="mt-1 whitespace-pre-line text-xs text-[#0B2545]">
                    {ficha.informacionImportante}
                  </p>
                </div>
              )}

              {ficha.opiniones.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    Opiniones de huéspedes
                  </p>
                  <ul className="mt-1 space-y-2">
                    {ficha.opiniones.map((opinion, indice) => (
                      <li
                        className="rounded-lg border border-[#E4E8EE] p-2 text-xs text-[#0B2545]"
                        key={`${opinion.autor ?? "anónimo"}-${indice}`}
                      >
                        <p className="font-medium">
                          {opinion.puntaje !== null
                            ? `${opinion.puntaje}/10 · `
                            : ""}
                          {opinion.autor ?? "Huésped"}
                          {opinion.fecha
                            ? ` · ${new Date(opinion.fecha).toLocaleDateString("es-MX")}`
                            : ""}
                        </p>
                        {opinion.bueno && (
                          <p className="text-[#0B2545]">👍 {opinion.bueno}</p>
                        )}
                        {opinion.malo && (
                          <p className="text-[#B4451F]">👎 {opinion.malo}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
              Habitaciones disponibles ({hotel.habitaciones.length})
            </p>
            <ul className="mt-2 space-y-3">
              {hotel.habitaciones.map((habitacion) => {
                const catalogo = ficha?.habitaciones.find(
                  (h) =>
                    h.nombre.toLocaleLowerCase() ===
                    habitacion.habitacion.toLocaleLowerCase(),
                );
                return (
                  <li
                    className="flex flex-col gap-3 rounded-lg border border-[#E4E8EE] p-3 sm:flex-row"
                    key={habitacion.ofertaId}
                  >
                    {catalogo?.fotos[0] && (
                      <Image
                        alt={habitacion.habitacion}
                        className="h-32 w-full rounded-md object-cover sm:h-24 sm:w-36"
                        height={128}
                        src={catalogo.fotos[0]}
                        unoptimized
                        width={192}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0B2545]">
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
                          catalogo?.metros ? `${catalogo.metros} m²` : null,
                          catalogo?.ocupacionMaxima
                            ? `hasta ${catalogo.ocupacionMaxima} huéspedes`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {catalogo?.camas.length ? (
                        <p className="text-xs text-[#5A6B80]">
                          {catalogo.camas.join(" · ")}
                        </p>
                      ) : null}
                      {catalogo?.servicios.length ? (
                        <p className="mt-1 text-xs text-[#5A6B80]">
                          {catalogo.servicios.slice(0, 8).join(" · ")}
                        </p>
                      ) : null}
                      {habitacion.impuestosNoIncluidos.length > 0 && (
                        <p className="mt-1 text-xs text-[#B4451F]">
                          Se paga en el hotel:{" "}
                          {habitacion.impuestosNoIncluidos
                            .map(
                              (i) =>
                                `${i.descripcion} ${dinero(i.monto, hotel.moneda)}`,
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right sm:w-36">
                      <p className="text-base font-bold text-[#0B2545]">
                        {dinero(habitacion.precioVenta, hotel.moneda)}
                      </p>
                      <p className="text-xs text-[#5A6B80]">
                        {hotel.noches} noche{hotel.noches === 1 ? "" : "s"} en
                        total
                      </p>
                      {mostrarMargen && (
                        <p className="text-xs text-[#9AA7B8]">
                          neto {dinero(habitacion.costoNeto, hotel.moneda)} +
                          markup {dinero(habitacion.markup, hotel.moneda)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
