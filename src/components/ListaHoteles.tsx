"use client";

import Image from "next/image";
import { useState } from "react";
import type { HotelConPrecio } from "@/app/api/hoteles/route";

interface Props {
  hoteles: HotelConPrecio[];
  mostrarMargen: boolean;
}

function dinero(monto: number, moneda: string): string {
  return `${moneda} ${monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ListaHoteles({ hoteles, mostrarMargen }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);

  if (hoteles.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-sm text-[#5A6B80] shadow">
        No hay hoteles disponibles con esos datos.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hoteles.map((hotel) => {
        const desplegado = abierto === hotel.hotelId;
        return (
          <article
            className="overflow-hidden rounded-xl bg-white shadow shadow-[#0B2545]/10"
            key={hotel.hotelId}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row">
              {hotel.foto && (
                <Image
                  alt={hotel.nombre}
                  className="h-40 w-full rounded-lg object-cover sm:h-28 sm:w-40"
                  height={160}
                  src={hotel.foto}
                  unoptimized
                  width={240}
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-semibold text-[#0B2545]">
                  {hotel.nombre}
                  {hotel.estrellas ? ` · ${"★".repeat(Math.round(hotel.estrellas))}` : ""}
                </h3>
                <p className="text-xs text-[#5A6B80]">
                  {[hotel.direccion, hotel.ciudad, hotel.pais].filter(Boolean).join(" · ")}{" "}
                  {hotel.bandera}
                </p>
                {hotel.calificacion !== null && (
                  <p className="text-xs text-[#5A6B80]">
                    Calificación {hotel.calificacion}
                    {hotel.resenas ? ` · ${hotel.resenas} reseñas` : ""}
                  </p>
                )}
                <p className="mt-1 text-xs text-[#5A6B80]">
                  {hotel.habitaciones.length} tarifa
                  {hotel.habitaciones.length === 1 ? "" : "s"} · {hotel.noches} noche
                  {hotel.noches === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-[#5A6B80]">Desde</p>
                <p className="text-xl font-bold text-[#0B2545]">
                  {dinero(hotel.desde, hotel.moneda)}
                </p>
                <button
                  className="mt-2 rounded-lg bg-[#F0A400] px-4 py-2 text-sm font-semibold text-[#0B2545]"
                  onClick={() => setAbierto(desplegado ? null : hotel.hotelId)}
                  type="button"
                >
                  {desplegado ? "Ocultar tarifas" : "Ver tarifas"}
                </button>
              </div>
            </div>

            {desplegado && (
              <ul className="divide-y divide-[#E4E8EE] border-t border-[#E4E8EE] bg-[#F9FAFC]">
                {hotel.habitaciones.map((habitacion) => (
                  <li className="flex flex-wrap items-center gap-2 px-4 py-3" key={habitacion.ofertaId}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0B2545]">{habitacion.habitacion}</p>
                      <p className="text-xs text-[#5A6B80]">
                        {[
                          habitacion.regimen,
                          habitacion.reembolsable === null
                            ? null
                            : habitacion.reembolsable
                              ? `reembolsable${habitacion.cancelaAntesDe ? ` hasta ${habitacion.cancelaAntesDe}` : ""}`
                              : "no reembolsable",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {habitacion.impuestosNoIncluidos.length > 0 && (
                        <p className="text-xs text-[#B4451F]">
                          Se paga en el hotel:{" "}
                          {habitacion.impuestosNoIncluidos
                            .map((i) => `${i.descripcion} ${dinero(i.monto, hotel.moneda)}`)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-[#0B2545]">
                        {dinero(habitacion.precioVenta, hotel.moneda)}
                      </p>
                      {mostrarMargen && (
                        <p className="text-xs text-[#5A6B80]">
                          neto {dinero(habitacion.costoNeto, hotel.moneda)} + markup{" "}
                          {dinero(habitacion.markup, hotel.moneda)}
                        </p>
                      )}
                      {habitacion.precioReferencia !== null && (
                        <p className="text-xs text-[#5A6B80]">
                          referencia {habitacion.fuenteReferencia ?? ""}{" "}
                          {dinero(habitacion.precioReferencia, hotel.moneda)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );
}
