"use client";

import type { OfertaConPrecio } from "@/app/api/buscar/route";
import {
  fechaCorta,
  horaCorta,
  minutosATexto,
} from "@/components/TarjetaOferta";

export function equipajeTexto(
  equipaje: { tipo: string; cantidad: number }[],
): string {
  if (equipaje.length === 0) return "Equipaje no informado por la aerolínea";
  const documentadas =
    equipaje.find((e) => e.tipo === "checked")?.cantidad ?? 0;
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

export function condicionesTexto(oferta: OfertaConPrecio): string {
  const cambios =
    oferta.cambiosPermitidos === null
      ? "Cambios: la aerolínea no informa"
      : oferta.cambiosPermitidos
        ? "Permite cambios (con penalización según tarifa)"
        : "No permite cambios";
  const reembolso =
    oferta.reembolsoPermitido === null
      ? "reembolso no informado"
      : oferta.reembolsoPermitido
        ? "reembolsable"
        : "no reembolsable";
  return `${cambios} · ${reembolso}`;
}

function nombrePasajero(
  pasajero: { tipo: string; edad: number | null },
  indice: number,
): string {
  if (pasajero.tipo === "infant_without_seat") return "Bebé en brazos";
  if (pasajero.edad !== null) return `Menor de ${pasajero.edad} años`;
  return `Adulto ${indice + 1}`;
}

/** Detalle vuelo por vuelo: números, horarios, avión, cabina y esperas de conexión. */
export function DetalleTramos({ oferta }: { oferta: OfertaConPrecio }) {
  return (
    <div className="space-y-3">
      {oferta.tramos.map((tramo, indice) => (
        <div key={`detalle-${indice}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
            {oferta.tramos.length === 2 && indice === 1
              ? "Regreso"
              : indice === 0
                ? "Ida"
                : `Tramo ${indice + 1}`}{" "}
            · {tramo.origenBandera} {tramo.origenNombre} ({tramo.origen}) –{" "}
            {tramo.destinoBandera} {tramo.destinoNombre} ({tramo.destino})
          </p>
          {tramo.segmentos.map((segmento) => (
            <div
              className="mt-1 text-xs text-[#0B2545]"
              key={segmento.vuelo + segmento.sale}
            >
              {segmento.esperaMinutos !== null && (
                <p className="my-1 text-[#5A6B80]">
                  Espera en {segmento.origenNombre} ({segmento.origen}):{" "}
                  {minutosATexto(segmento.esperaMinutos)}
                </p>
              )}
              <p>
                <span className="font-mono">{segmento.vuelo}</span> ·{" "}
                {segmento.origenBandera} {segmento.origenNombre} (
                {segmento.origen}) {fechaCorta(segmento.sale)}{" "}
                {horaCorta(segmento.sale)} → {segmento.destinoBandera}{" "}
                {segmento.destinoNombre} ({segmento.destino}){" "}
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
          <p className="mt-1 text-xs text-[#5A6B80]">
            Equipaje incluido: {equipajeTexto(tramo.equipaje)}
            {tramo.marcaTarifa ? ` · tarifa ${tramo.marcaTarifa}` : ""}
          </p>
        </div>
      ))}
      <p className="text-xs text-[#5A6B80]">{condicionesTexto(oferta)}</p>
    </div>
  );
}

interface Props {
  oferta: OfertaConPrecio;
  mostrarMargen: boolean;
}

/** Resumen completo del vuelo elegido, para tenerlo a la vista al capturar pasajeros. */
export default function ResumenVuelo({ oferta, mostrarMargen }: Props) {
  const pasajeros = oferta.pasajeros.length;

  return (
    <aside className="h-fit rounded-xl border border-[#E4E8EE] bg-white p-4 lg:sticky lg:top-4">
      <div className="flex items-center gap-2">
        {oferta.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={oferta.aerolinea}
            className="h-6 w-6 rounded"
            src={oferta.logo}
          />
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded bg-[#E4E8EE] font-mono text-[10px] text-[#14477E]">
            {oferta.aerolineaIata}
          </span>
        )}
        <span className="text-sm font-semibold text-[#0B2545]">
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
          className="mt-3 border-t border-[#E4E8EE] pt-3"
          key={`resumen-${indice}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
            {oferta.tramos.length === 2 && indice === 1
              ? "Regreso"
              : indice === 0
                ? "Ida"
                : `Tramo ${indice + 1}`}{" "}
            · {fechaCorta(tramo.segmentos[0].sale)}
          </p>
          <p className="text-lg font-semibold tabular-nums text-[#0B2545]">
            {horaCorta(tramo.segmentos[0].sale)}
            <span className="mx-2 text-[#9AA7B8]">–</span>
            {horaCorta(tramo.segmentos[tramo.segmentos.length - 1].llega)}
          </p>
          <p className="text-sm text-[#5A6B80]">
            {tramo.origenBandera} {tramo.origen} → {tramo.destinoBandera}{" "}
            {tramo.destino} · {minutosATexto(tramo.minutos)} ·{" "}
            {tramo.escalas === 0
              ? "directo"
              : `${tramo.escalas} escala${tramo.escalas === 1 ? "" : "s"} (${tramo.segmentos
                  .slice(0, -1)
                  .map((s) => s.destino)
                  .join(", ")})`}
          </p>
          <p className="text-xs text-[#5A6B80]">
            {[tramo.origenCiudad ?? tramo.origenNombre, tramo.origenPais]
              .filter(Boolean)
              .join(", ")}{" "}
            →{" "}
            {[tramo.destinoCiudad ?? tramo.destinoNombre, tramo.destinoPais]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      ))}

      <div className="mt-3 border-t border-[#E4E8EE] pt-3">
        <DetalleTramos oferta={oferta} />
      </div>

      <div className="mt-3 border-t border-[#E4E8EE] pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
          Pasajeros
        </p>
        <ul className="mt-1 text-xs text-[#0B2545]">
          {oferta.pasajeros.map((pasajero, indice) => (
            <li key={`pasajero-${indice}`}>
              {nombrePasajero(pasajero, indice)}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 border-t border-[#E4E8EE] pt-3">
        <p className="text-2xl font-semibold text-[#0B2545]">
          {oferta.precioVenta.toLocaleString("es-MX", {
            maximumFractionDigits: 2,
          })}
          <span className="ml-1 text-sm font-normal text-[#5A6B80]">
            {oferta.moneda}
          </span>
        </p>
        <p className="text-xs text-[#5A6B80]">
          total {pasajeros} pasajero{pasajeros === 1 ? "" : "s"} · impuestos
          incluidos
        </p>
        {mostrarMargen && (
          <p className="mt-1 text-xs text-[#9AA7B8]">
            neto{" "}
            {oferta.costoNeto.toLocaleString("es-MX", {
              maximumFractionDigits: 2,
            })}{" "}
            + markup{" "}
            {oferta.markup.toLocaleString("es-MX", {
              maximumFractionDigits: 2,
            })}
          </p>
        )}
        <p className="mt-1 text-xs text-[#5A6B80]">
          Esta tarifa vence el {fechaCorta(oferta.expiraEn)} a las{" "}
          {horaCorta(oferta.expiraEn)}; si se vence hay que volver a buscar.
        </p>
      </div>
    </aside>
  );
}
