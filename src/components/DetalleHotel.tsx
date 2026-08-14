"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FichaHotel } from "@/app/api/hoteles/[hotelId]/route";
import type { HotelConPrecio, HabitacionConPrecio } from "@/app/api/hoteles/route";
import Precio from "@/components/Precio";
import { emparejarHabitacion } from "@/lib/habitaciones";
import Bandera from "@/components/Bandera";
import { CaracteristicasHabitacion, ServiciosHotel } from "@/components/Caracteristicas";

interface Props {
  hotel: HotelConPrecio;
  ficha: FichaHotel | null;
  cargando: boolean;
  error: string | null;
  mostrarMargen: boolean;
  onCerrar: () => void;
  onElegir?: (hotel: HotelConPrecio, habitacion: HabitacionConPrecio) => void;
}

export default function DetalleHotel({
  hotel,
  ficha,
  cargando,
  error,
  mostrarMargen,
  onCerrar,
  onElegir,
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
              <Bandera bandera={hotel.bandera} />
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {onElegir && hotel.habitaciones[0] && (
              <button
                className="rounded-lg bg-[#F0A400] px-3 py-1.5 text-sm font-semibold text-[#0B2545]"
                onClick={() => onElegir(hotel, hotel.habitaciones[0])}
                type="button"
              >
                Elegir tarifa principal
              </button>
            )}
            <button
              aria-label="Cerrar detalle del hotel"
              className="shrink-0 rounded-full border border-[#E4E8EE] px-3 py-1 text-sm text-[#0B2545]"
              onClick={onCerrar}
              type="button"
            >
              Cerrar
            </button>
          </div>
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
                    <Precio moneda={hotel.moneda} monto={hotel.desde} />
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
                  <ServiciosHotel servicios={ficha.servicios} limite={60} />
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
                const catalogo = emparejarHabitacion(
                  habitacion.habitacion,
                  ficha?.habitaciones,
                );
                const foto =
                  catalogo?.fotos[0] ?? ficha?.fotosHabitaciones[0] ?? null;
                return (
                  <li
                    className="flex flex-col gap-3 rounded-lg border border-[#E4E8EE] p-3 sm:flex-row"
                    key={habitacion.ofertaId}
                  >
                    {foto && (
                      <Image
                        alt={habitacion.habitacion}
                        className="h-32 w-full rounded-md object-cover sm:h-24 sm:w-36"
                        height={128}
                        src={foto}
                        unoptimized
                        width={192}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#0B2545]">
                        {habitacion.habitacion}
                      </p>
                      <div className="mt-1">
                        <CaracteristicasHabitacion
                          catalogo={catalogo}
                          habitacion={habitacion}
                          limiteServicios={8}
                        />
                      </div>
                      {habitacion.impuestosNoIncluidos.length > 0 && (
                        <p className="mt-1 text-xs text-[#B4451F]">
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
                    <div className="text-right sm:w-36">
                      <p className="text-base font-bold text-[#0B2545]">
                        <Precio
                          moneda={hotel.moneda}
                          monto={habitacion.precioVenta}
                        />
                      </p>
                      <p className="text-xs text-[#5A6B80]">
                        {hotel.noches} noche{hotel.noches === 1 ? "" : "s"} en
                        total
                      </p>
                      {mostrarMargen && (
                        <p className="text-xs text-[#9AA7B8]">
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
                      {onElegir && (
                        <button
                          className="mt-2 rounded-lg bg-[#F0A400] px-3 py-1.5 text-sm font-semibold text-[#0B2545]"
                          onClick={() => onElegir(hotel, habitacion)}
                          type="button"
                        >
                          Elegir
                        </button>
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
