"use client";

import { useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import Bandera from "@/components/Bandera";
import LogoAerolinea from "@/components/LogoAerolinea";
import IconoFranja from "@/components/IconoFranja";
import Precio from "@/components/Precio";
import { CaracteristicasVuelo } from "@/components/Caracteristicas";
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

function nombreTramo(total: number, indice: number): string {
  if (indice === 0) return "Ida";
  if (total === 2) return "Regreso";
  return `Tramo ${indice + 1}`;
}

function nombrePasajero(
  pasajero: { tipo: string; edad: number | null },
  indice: number,
): string {
  if (pasajero.tipo === "infant_without_seat") return "Bebé en brazos";
  if (pasajero.edad !== null) return `Menor de ${pasajero.edad} años`;
  return `Adulto ${indice + 1}`;
}

/** Detalle vuelo por vuelo, como línea de tiempo: hora a la izquierda, aeropuerto a la derecha. */
export function DetalleTramos({ oferta }: { oferta: OfertaConPrecio }) {
  return (
    <div className="space-y-4">
      {oferta.tramos.map((tramo, indice) => (
        <div
          className="overflow-hidden rounded-lg border border-[#E4E8EE] bg-white"
          key={`detalle-${indice}`}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 bg-[#0B2545] px-3 py-2 text-white">
            <p className="text-sm font-semibold">
              {nombreTramo(oferta.tramos.length, indice)} ·{" "}
              <Bandera bandera={tramo.origenBandera} pais={tramo.origenPais} /> {tramo.origen} →{" "}
              <Bandera bandera={tramo.destinoBandera} pais={tramo.destinoPais} /> {tramo.destino}
            </p>
            <p className="text-xs text-white/70">
              {fechaCorta(tramo.segmentos[0].sale)} ·{" "}
              {minutosATexto(tramo.minutos)} ·{" "}
              {tramo.escalas === 0
                ? "directo"
                : `${tramo.escalas} escala${tramo.escalas === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="px-3 py-3">
            {tramo.segmentos.map((segmento) => (
              <div key={segmento.vuelo + segmento.sale}>
                {segmento.esperaMinutos !== null && (
                  <p className="my-2 rounded-md bg-[#FFF6E0] px-2 py-1.5 text-xs font-medium text-[#8A6A00]">
                    Escala de {minutosATexto(segmento.esperaMinutos)} en{" "}
                    <Bandera bandera={segmento.origenBandera} pais={segmento.origenPais} /> {segmento.origen} ·{" "}
                    {segmento.origenNombre}
                  </p>
                )}

                <div className="flex gap-3">
                  <div className="w-14 shrink-0 pt-0.5 text-right">
                    <p className="text-sm font-semibold tabular-nums text-[#0B2545]">
                      {horaCorta(segmento.sale)}{" "}
                      <IconoFranja iso={segmento.sale} />
                    </p>
                  </div>
                  <div className="relative flex w-3 shrink-0 justify-center">
                    <span className="absolute top-1.5 h-2 w-2 rounded-full border-2 border-[#14477E] bg-white" />
                    <span className="absolute top-3.5 bottom-3.5 w-px bg-[#E4E8EE]" />
                    <span className="absolute bottom-1.5 h-2 w-2 rounded-full bg-[#14477E]" />
                  </div>
                  <div className="min-w-0 flex-1 pb-3">
                    <p className="text-sm font-medium text-[#0B2545]">
                      <Bandera bandera={segmento.origenBandera} pais={segmento.origenPais} />{" "}
                      {segmento.origen} · {segmento.origenNombre}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-[#5A6B80]">
                      <LogoAerolinea
                        className="h-4 w-4"
                        iata={segmento.aerolineaIata}
                        nombre={segmento.aerolinea}
                      />
                      <span className="font-mono text-[#14477E]">
                        {segmento.vuelo}
                      </span>{" "}
                      · {segmento.aerolinea} · {minutosATexto(segmento.minutos)}{" "}
                      de vuelo
                      {segmento.cabina ? ` · ${segmento.cabina}` : ""}
                      {segmento.avion ? ` · ${segmento.avion}` : ""}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#0B2545]">
                      <Bandera bandera={segmento.destinoBandera} pais={segmento.destinoPais} />{" "}
                      {segmento.destino} · {segmento.destinoNombre}
                    </p>
                  </div>
                  <div className="w-14 shrink-0 self-end pb-3 text-right">
                    <p className="text-sm font-semibold tabular-nums text-[#0B2545]">
                      {horaCorta(segmento.llega)}{" "}
                      <IconoFranja iso={segmento.llega} />
                    </p>
                    {fechaCorta(segmento.llega) !==
                      fechaCorta(segmento.sale) && (
                      <p className="text-[10px] text-[#B4451F]">+1 día</p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <p className="border-t border-[#E4E8EE] pt-2 text-xs text-[#5A6B80]">
              Equipaje incluido: {equipajeTexto(tramo.equipaje)}
              {tramo.marcaTarifa ? ` · tarifa ${tramo.marcaTarifa}` : ""}
            </p>
          </div>
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

/** Tira ancha con el vuelo elegido, arriba del formulario de pasajeros. */
export default function ResumenVuelo({ oferta, mostrarMargen }: Props) {
  const pasajeros = oferta.pasajeros.length;
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  return (
    <section className="rounded-xl border border-[#E4E8EE] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LogoAerolinea
            iata={oferta.aerolineaIata}
            logo={oferta.logo}
            nombre={oferta.aerolinea}
          />
          <span className="text-sm font-semibold text-[#0B2545]">
            {oferta.aerolinea}
          </span>
          {oferta.tramos[0]?.marcaTarifa && (
            <span className="rounded-full bg-[#E4E8EE] px-2 py-0.5 text-xs text-[#14477E]">
              {oferta.tramos[0].marcaTarifa}
            </span>
          )}
          <span className="text-xs text-[#5A6B80]">
            ·{" "}
            {oferta.pasajeros
              .map((pasajero, indice) => nombrePasajero(pasajero, indice))
              .join(" · ")}
          </span>
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold text-[#0B2545]">
            <Precio moneda={oferta.moneda} monto={oferta.precioVenta} />
          </p>
          <p className="text-xs text-[#5A6B80]">
            total {pasajeros} pasajero{pasajeros === 1 ? "" : "s"} · impuestos
            incluidos
            {mostrarMargen && (
              <>
                {" · neto "}
                <Precio moneda={oferta.moneda} monto={oferta.costoNeto} /> +
                markup{" "}
                <Precio moneda={oferta.moneda} monto={oferta.markup} />
              </>
            )}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <CaracteristicasVuelo oferta={oferta} />
      </div>

      <div
        className={`mt-3 grid gap-3 border-t border-[#E4E8EE] pt-3 ${
          oferta.tramos.length === 1
            ? ""
            : oferta.tramos.length === 2
              ? "sm:grid-cols-2"
              : "sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {oferta.tramos.map((tramo, indice) => (
          <div key={`tira-${indice}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
              {nombreTramo(oferta.tramos.length, indice)} ·{" "}
              {fechaCorta(tramo.segmentos[0].sale)}
            </p>
            <p className="text-lg font-semibold tabular-nums text-[#0B2545]">
              {horaCorta(tramo.segmentos[0].sale)}
              <IconoFranja className="ml-1" iso={tramo.segmentos[0].sale} />
              <span className="mx-2 text-[#9AA7B8]">–</span>
              {horaCorta(tramo.segmentos[tramo.segmentos.length - 1].llega)}
              <IconoFranja
                className="ml-1"
                iso={tramo.segmentos[tramo.segmentos.length - 1].llega}
              />
            </p>
            <p className="text-sm text-[#5A6B80]">
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
            <p className="mt-1 text-xs text-[#5A6B80]">
              Equipaje: {equipajeTexto(tramo.equipaje)}
            </p>
          </div>
        ))}
      </div>

      <button
        className="mt-3 text-xs font-semibold text-[#14477E] underline"
        onClick={() => setDetalleAbierto((abierto) => !abierto)}
        type="button"
      >
        {detalleAbierto
          ? "Ocultar el detalle vuelo por vuelo"
          : "Ver el detalle vuelo por vuelo y condiciones"}
      </button>

      {detalleAbierto && (
        <div className="mt-3 border-t border-[#E4E8EE] pt-3">
          <DetalleTramos oferta={oferta} />
        </div>
      )}

      <p className="mt-2 text-xs text-[#5A6B80]">
        Esta tarifa vence el {fechaCorta(oferta.expiraEn)} a las{" "}
        {horaCorta(oferta.expiraEn)}; si se vence hay que volver a buscar.
      </p>
    </section>
  );
}
