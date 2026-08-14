"use client";

import { useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import Bandera from "@/components/Bandera";
import { DetalleTramos, equipajeTexto } from "@/components/ResumenVuelo";
import LogoAerolinea from "@/components/LogoAerolinea";
import IconoFranja from "@/components/IconoFranja";
import Precio from "@/components/Precio";

export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function minutosATexto(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return `${horas}h${resto > 0 ? ` ${resto}m` : ""}`;
}

interface Props {
  oferta: OfertaConPrecio;
  mostrarMargen: boolean;
  onElegir: (oferta: OfertaConPrecio) => void;
}

export default function TarjetaOferta({
  oferta,
  mostrarMargen,
  onElegir,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const pasajeros = oferta.pasajeros.length;

  return (
    <li className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white transition hover:border-[#14477E]/40 hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <LogoAerolinea
              iata={oferta.aerolineaIata}
              logo={oferta.logo}
              nombre={oferta.aerolinea}
            />
            <span className="text-sm font-medium text-[#0B2545]">
              {oferta.aerolinea}
            </span>
            {oferta.tramos[0]?.marcaTarifa && (
              <span className="rounded-full bg-[#E4E8EE] px-2 py-0.5 text-xs text-[#14477E]">
                {oferta.tramos[0].marcaTarifa}
              </span>
            )}
          </div>

          {oferta.tramos.map((tramo, indice) => (
            <div
              className="border-t border-[#E4E8EE] py-3 first:border-t-0 first:pt-0"
              key={indice}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="text-lg font-semibold tabular-nums text-[#0B2545]">
                  {horaCorta(tramo.segmentos[0].sale)}
                  <IconoFranja className="ml-1" iso={tramo.segmentos[0].sale} />
                  <span className="mx-2 text-[#9AA7B8]">–</span>
                  {horaCorta(tramo.segmentos[tramo.segmentos.length - 1].llega)}
                  <IconoFranja
                    className="ml-1"
                    iso={tramo.segmentos[tramo.segmentos.length - 1].llega}
                  />
                </div>
                <div className="text-sm text-[#5A6B80]">
                  <Bandera bandera={tramo.origenBandera} pais={tramo.origenPais} /> {tramo.origen} →{" "}
                  <Bandera bandera={tramo.destinoBandera} pais={tramo.destinoPais} /> {tramo.destino} ·{" "}
                  {minutosATexto(tramo.minutos)} ·{" "}
                  {tramo.escalas === 0 ? (
                    "directo"
                  ) : (
                    <span>
                      {tramo.escalas} escala{tramo.escalas === 1 ? "" : "s"} (
                      {tramo.segmentos.slice(0, -1).map((s, i) => (
                        <span key={i}>
                          {i > 0 ? ", " : ""}
                          <Bandera bandera={s.destinoBandera} pais={s.destinoPais} /> {s.destino}
                        </span>
                      ))}
                      )
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#5A6B80]">
                {[tramo.origenCiudad ?? tramo.origenNombre, tramo.origenPais]
                  .filter(Boolean)
                  .join(", ")}{" "}
                →{" "}
                {[tramo.destinoCiudad ?? tramo.destinoNombre, tramo.destinoPais]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <p className="mt-1 text-xs text-[#5A6B80]">
                {fechaCorta(tramo.segmentos[0].sale)} ·{" "}
                {equipajeTexto(tramo.equipaje)}
              </p>
            </div>
          ))}

          <button
            className="mt-1 text-xs font-medium text-[#14477E] underline"
            onClick={() => setAbierto((v) => !v)}
            type="button"
          >
            {abierto
              ? "Ocultar detalle de vuelos"
              : "Ver detalle de vuelos y condiciones"}
          </button>

          {abierto && (
            <div className="mt-3 rounded-lg bg-[#F5F7FA] p-3">
              <DetalleTramos oferta={oferta} />
              {oferta.cotizacionId && (
                <p className="mt-3 text-xs text-[#5A6B80]">
                  Cotización guardada #{oferta.cotizacionId} — úsala para armar
                  el itinerario en /admin/itinerarios
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-between gap-2 border-t border-[#E4E8EE] pt-3 sm:w-52 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="text-right">
            <p className="text-2xl font-semibold text-[#0B2545]">
              <Precio moneda={oferta.moneda} monto={oferta.precioVenta} />
            </p>
            <p className="text-xs text-[#5A6B80]">
              total {pasajeros} pasajero{pasajeros === 1 ? "" : "s"} · impuestos
              incluidos
            </p>
            {mostrarMargen && (
              <p className="mt-1 text-xs text-[#9AA7B8]">
                neto <Precio moneda={oferta.moneda} monto={oferta.costoNeto} /> +
                markup <Precio moneda={oferta.moneda} monto={oferta.markup} />
              </p>
            )}
          </div>
          <button
            className="w-full rounded-lg bg-[#C9A227] px-4 py-2.5 text-sm font-semibold text-[#0B2545] transition hover:bg-[#b8931f]"
            onClick={() => onElegir(oferta)}
            type="button"
          >
            Elegir
          </button>
        </div>
      </div>
    </li>
  );
}
