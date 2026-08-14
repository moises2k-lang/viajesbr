"use client";

import { useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";

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

function equipajeTexto(equipaje: { tipo: string; cantidad: number }[]): string {
  if (equipaje.length === 0) return "Equipaje no informado por la aerolínea";
  const documentadas = equipaje.find((e) => e.tipo === "checked")?.cantidad ?? 0;
  const mano = equipaje.find((e) => e.tipo === "carry_on")?.cantidad ?? 0;
  const partes: string[] = [];
  if (mano > 0) partes.push(`${mano} de mano`);
  partes.push(
    documentadas > 0
      ? `${documentadas} documentada${documentadas === 1 ? "" : "s"}`
      : "sin maleta documentada",
  );
  return partes.join(" · ");
}

interface Props {
  oferta: OfertaConPrecio;
  mostrarMargen: boolean;
  onElegir: (oferta: OfertaConPrecio) => void;
}

export default function TarjetaOferta({ oferta, mostrarMargen, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const pasajeros = oferta.pasajeros.length;

  return (
    <li className="overflow-hidden rounded-xl border border-[#E4E8EE] bg-white transition hover:border-[#14477E]/40 hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            {oferta.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={oferta.aerolinea} className="h-6 w-6 rounded" src={oferta.logo} />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#E4E8EE] font-mono text-[10px] text-[#14477E]">
                {oferta.aerolineaIata}
              </span>
            )}
            <span className="text-sm font-medium text-[#0B2545]">{oferta.aerolinea}</span>
            {oferta.tramos[0]?.marcaTarifa && (
              <span className="rounded-full bg-[#E4E8EE] px-2 py-0.5 text-xs text-[#14477E]">
                {oferta.tramos[0].marcaTarifa}
              </span>
            )}
          </div>

          {oferta.tramos.map((tramo, indice) => (
            <div className="border-t border-[#E4E8EE] py-3 first:border-t-0 first:pt-0" key={indice}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="text-lg font-semibold tabular-nums text-[#0B2545]">
                  {horaCorta(tramo.segmentos[0].sale)}
                  <span className="mx-2 text-[#9AA7B8]">–</span>
                  {horaCorta(tramo.segmentos[tramo.segmentos.length - 1].llega)}
                </div>
                <div className="text-sm text-[#5A6B80]">
                  {tramo.origen} → {tramo.destino} · {minutosATexto(tramo.minutos)} ·{" "}
                  {tramo.escalas === 0
                    ? "directo"
                    : `${tramo.escalas} escala${tramo.escalas === 1 ? "" : "s"} (${tramo.segmentos
                        .slice(0, -1)
                        .map((s) => s.destino)
                        .join(", ")})`}
                </div>
              </div>
              <p className="mt-1 text-xs text-[#5A6B80]">
                {fechaCorta(tramo.segmentos[0].sale)} · {equipajeTexto(tramo.equipaje)}
              </p>
            </div>
          ))}

          <button
            className="mt-1 text-xs font-medium text-[#14477E] underline"
            onClick={() => setAbierto((v) => !v)}
            type="button"
          >
            {abierto ? "Ocultar detalle de vuelos" : "Ver detalle de vuelos y condiciones"}
          </button>

          {abierto && (
            <div className="mt-3 space-y-3 rounded-lg bg-[#F5F7FA] p-3">
              {oferta.tramos.map((tramo, indice) => (
                <div key={`detalle-${indice}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                    {indice === 0 ? "Ida" : `Tramo ${indice + 1}`} · {tramo.origenNombre} –{" "}
                    {tramo.destinoNombre}
                  </p>
                  {tramo.segmentos.map((segmento) => (
                    <div className="mt-1 text-xs text-[#0B2545]" key={segmento.vuelo + segmento.sale}>
                      {segmento.esperaMinutos !== null && (
                        <p className="my-1 text-[#5A6B80]">
                          Espera en {segmento.origen}: {minutosATexto(segmento.esperaMinutos)}
                        </p>
                      )}
                      <p>
                        <span className="font-mono">{segmento.vuelo}</span> · {segmento.origen}{" "}
                        {fechaCorta(segmento.sale)} {horaCorta(segmento.sale)} → {segmento.destino}{" "}
                        {fechaCorta(segmento.llega)} {horaCorta(segmento.llega)} ·{" "}
                        {minutosATexto(segmento.minutos)}
                      </p>
                      <p className="text-[#5A6B80]">
                        {segmento.aerolinea}
                        {segmento.cabina ? ` · ${segmento.cabina}` : ""}
                        {segmento.avion ? ` · ${segmento.avion}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ))}
              <p className="text-xs text-[#5A6B80]">
                {oferta.cambiosPermitidos === null
                  ? "Cambios: la aerolínea no informa"
                  : oferta.cambiosPermitidos
                    ? "Permite cambios (con penalización según tarifa)"
                    : "No permite cambios"}
                {" · "}
                {oferta.reembolsoPermitido === null
                  ? "reembolso no informado"
                  : oferta.reembolsoPermitido
                    ? "reembolsable"
                    : "no reembolsable"}
              </p>
              {oferta.cotizacionId && (
                <p className="text-xs text-[#5A6B80]">
                  Cotización guardada #{oferta.cotizacionId} — úsala para armar el itinerario en
                  /admin/itinerarios
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end justify-between gap-2 border-t border-[#E4E8EE] pt-3 sm:w-52 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="text-right">
            <p className="text-2xl font-semibold text-[#0B2545]">
              {oferta.precioVenta.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
              <span className="ml-1 text-sm font-normal text-[#5A6B80]">{oferta.moneda}</span>
            </p>
            <p className="text-xs text-[#5A6B80]">
              total {pasajeros} pasajero{pasajeros === 1 ? "" : "s"} · impuestos incluidos
            </p>
            {mostrarMargen && (
              <p className="mt-1 text-xs text-[#9AA7B8]">
                neto {oferta.costoNeto.toLocaleString("es-MX", { maximumFractionDigits: 2 })} + markup{" "}
                {oferta.markup.toLocaleString("es-MX", { maximumFractionDigits: 2 })}
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
