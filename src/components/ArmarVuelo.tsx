"use client";

import { useMemo, useState } from "react";
import type {
  AerolineaResumen,
  CombinacionTramos,
  OpcionTramo,
} from "@/app/api/buscar/route";
import Bandera from "@/components/Bandera";
import {
  fechaCorta,
  horaCorta,
  minutosATexto,
} from "@/components/TarjetaOferta";
import { FRANJAS, dentroDeFranjas } from "@/lib/franjas";

interface Filtros {
  escalasMaximas: number | null;
  escalaEn: string[];
  vuelo: string;
  esperaMaxima: number | null;
  franjas: number[];
}

const FILTROS_INICIALES: Filtros = {
  escalasMaximas: null,
  escalaEn: [],
  vuelo: "",
  esperaMaxima: null,
  franjas: [],
};

function nombreTramo(indice: number, total: number): string {
  if (total === 2) return indice === 0 ? "Ida" : "Regreso";
  return `Tramo ${indice + 1}`;
}

function esperaMaxima(opcion: OpcionTramo): number {
  const esperas = opcion.tramo.segmentos
    .map((s) => s.esperaMinutos)
    .filter((m): m is number => m !== null);
  return esperas.length === 0 ? 0 : Math.max(...esperas);
}

function cumpleFiltros(opcion: OpcionTramo, filtros: Filtros): boolean {
  const tramo = opcion.tramo;
  if (
    filtros.escalasMaximas !== null &&
    tramo.escalas > filtros.escalasMaximas
  ) {
    return false;
  }
  if (filtros.escalaEn.length > 0) {
    const escalas = tramo.segmentos.slice(0, -1).map((s) => s.destino);
    if (!escalas.some((codigo) => filtros.escalaEn.includes(codigo)))
      return false;
  }
  const buscado = filtros.vuelo.trim().toUpperCase().replace(/\s+/g, "");
  if (buscado !== "") {
    const vuelos = tramo.segmentos.map((s) => s.vuelo.toUpperCase());
    const pedidos = buscado.split(",").filter(Boolean);
    if (!pedidos.every((pedido) => vuelos.some((v) => v.includes(pedido)))) {
      return false;
    }
  }
  if (
    filtros.esperaMaxima !== null &&
    esperaMaxima(opcion) > filtros.esperaMaxima
  ) {
    return false;
  }
  if (!dentroDeFranjas(tramo.segmentos[0].sale, filtros.franjas)) return false;
  return true;
}

interface Props {
  opciones: OpcionTramo[];
  combinaciones: CombinacionTramos[];
  aerolineas: Record<string, AerolineaResumen>;
  moneda: string;
  tramos: number;
  mostrarMargen: boolean;
  cargando: boolean;
  onElegir: (ofertaId: string) => void;
}

export default function ArmarVuelo({
  opciones,
  combinaciones,
  aerolineas,
  moneda,
  tramos,
  mostrarMargen,
  cargando,
  onElegir,
}: Props) {
  const [elegidas, setElegidas] = useState<(number | null)[]>(() =>
    Array.from({ length: tramos }, () => null),
  );
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [visibles, setVisibles] = useState(12);

  const porId = useMemo(
    () => new Map(opciones.map((opcion) => [opcion.id, opcion])),
    [opciones],
  );

  const paso = elegidas.findIndex((valor) => valor === null);
  const completo = paso === -1;

  /** Combinaciones que respetan lo ya elegido: nunca se ofrece un enlace que no se vende. */
  const compatibles = useMemo(
    () =>
      combinaciones.filter((combo) =>
        elegidas.every(
          (elegida, indice) =>
            elegida === null || combo.opciones[indice] === elegida,
        ),
      ),
    [combinaciones, elegidas],
  );

  const candidatas = useMemo(() => {
    if (completo) return [];
    const precios = new Map<number, number>();
    for (const combo of compatibles) {
      const id = combo.opciones[paso];
      const actual = precios.get(id);
      if (actual === undefined || combo.precioVenta < actual) {
        precios.set(id, combo.precioVenta);
      }
    }
    return [...precios.entries()]
      .map(([id, precio]) => ({ opcion: porId.get(id), precio }))
      .filter(
        (fila): fila is { opcion: OpcionTramo; precio: number } =>
          fila.opcion !== undefined,
      )
      .filter((fila) => cumpleFiltros(fila.opcion, filtros))
      .sort(
        (a, b) =>
          a.precio - b.precio ||
          a.opcion.tramo.minutos - b.opcion.tramo.minutos,
      );
  }, [compatibles, completo, filtros, paso, porId]);

  const escalasDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const opcion of opciones) {
      if (completo || opcion.indice !== paso) continue;
      for (const segmento of opcion.tramo.segmentos.slice(0, -1)) {
        mapa.set(
          segmento.destino,
          segmento.destinoCiudad ?? segmento.destinoNombre,
        );
      }
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [completo, opciones, paso]);

  const precioBase = candidatas.length > 0 ? candidatas[0].precio : 0;

  const tarifas = useMemo(
    () => [...compatibles].sort((a, b) => a.precioVenta - b.precioVenta),
    [compatibles],
  );

  function elegirOpcion(indice: number, id: number) {
    setElegidas((actuales) =>
      actuales.map((valor, i) => (i === indice ? id : valor)),
    );
    setFiltros(FILTROS_INICIALES);
    setVisibles(12);
  }

  function limpiarDesde(indice: number) {
    setElegidas((actuales) =>
      actuales.map((valor, i) => (i < indice ? valor : null)),
    );
    setFiltros(FILTROS_INICIALES);
    setVisibles(12);
  }

  return (
    <section className="mt-6">
      <ol className="flex flex-wrap gap-2">
        {elegidas.map((id, indice) => {
          const opcion = id === null ? null : porId.get(id);
          const activo = indice === paso;
          return (
            <li
              className={`flex min-w-0 flex-1 basis-64 flex-col gap-1 rounded-xl border p-3 text-sm ${
                activo
                  ? "border-[#14477E] bg-white"
                  : "border-[#E4E8EE] bg-white/70"
              }`}
              key={indice}
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                {indice + 1}. {nombreTramo(indice, tramos)}
              </span>
              {opcion ? (
                <>
                  <span className="font-medium text-[#0B2545]">
                    {horaCorta(opcion.tramo.segmentos[0].sale)} –{" "}
                    {horaCorta(
                      opcion.tramo.segmentos[opcion.tramo.segmentos.length - 1]
                        .llega,
                    )}{" "}
                    · {opcion.tramo.segmentos.map((s) => s.vuelo).join(" + ")}
                  </span>
                  <button
                    className="self-start text-xs font-medium text-[#14477E] underline"
                    onClick={() => limpiarDesde(indice)}
                    type="button"
                  >
                    Cambiar
                  </button>
                </>
              ) : (
                <span className="text-[#5A6B80]">
                  {activo ? "Elige tu vuelo" : "Pendiente"}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {!completo && (
        <>
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-[#E4E8EE] bg-white p-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Escalas
              </p>
              <div className="mt-1 flex rounded-full bg-[#E4E8EE] p-1">
                {[
                  { texto: "Todas", valor: null },
                  { texto: "Directo", valor: 0 },
                  { texto: "1", valor: 1 },
                  { texto: "2", valor: 2 },
                ].map((opcion) => (
                  <button
                    className={`rounded-full px-3 py-1 font-medium ${
                      filtros.escalasMaximas === opcion.valor
                        ? "bg-white text-[#0B2545] shadow"
                        : "text-[#5A6B80]"
                    }`}
                    key={String(opcion.valor)}
                    onClick={() =>
                      setFiltros({ ...filtros, escalasMaximas: opcion.valor })
                    }
                    type="button"
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex min-w-0 flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Número de vuelo
              </span>
              <input
                className="w-40 min-w-0 rounded-lg border border-[#E4E8EE] px-3 py-1.5"
                onChange={(e) =>
                  setFiltros({ ...filtros, vuelo: e.target.value })
                }
                placeholder="AV73, AV87"
                value={filtros.vuelo}
              />
            </label>

            {escalasDisponibles.length > 0 && (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                  Escala en
                </p>
                <div className="mt-1 flex max-w-full flex-wrap gap-1">
                  {escalasDisponibles.map(([codigo, ciudad]) => (
                    <button
                      className={`rounded-full border px-2.5 py-1 text-xs ${
                        filtros.escalaEn.includes(codigo)
                          ? "border-[#14477E] bg-[#14477E] text-white"
                          : "border-[#E4E8EE] text-[#0B2545]"
                      }`}
                      key={codigo}
                      onClick={() =>
                        setFiltros({
                          ...filtros,
                          escalaEn: filtros.escalaEn.includes(codigo)
                            ? filtros.escalaEn.filter((c) => c !== codigo)
                            : [...filtros.escalaEn, codigo],
                        })
                      }
                      type="button"
                    >
                      {codigo} · {ciudad}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Sale
              </p>
              <div className="mt-1 flex max-w-full flex-wrap gap-1">
                {FRANJAS.map((franja, indice) => (
                  <button
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      filtros.franjas.includes(indice)
                        ? "border-[#14477E] bg-[#14477E] text-white"
                        : "border-[#E4E8EE] text-[#0B2545]"
                    }`}
                    key={franja.texto}
                    onClick={() =>
                      setFiltros({
                        ...filtros,
                        franjas: filtros.franjas.includes(indice)
                          ? filtros.franjas.filter((i) => i !== indice)
                          : [...filtros.franjas, indice],
                      })
                    }
                    type="button"
                  >
                    {franja.texto} {franja.detalle}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Espera máxima en escala
              </span>
              <select
                className="rounded-lg border border-[#E4E8EE] px-3 py-1.5"
                onChange={(e) =>
                  setFiltros({
                    ...filtros,
                    esperaMaxima:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                value={filtros.esperaMaxima ?? ""}
              >
                <option value="">Sin límite</option>
                {[90, 180, 300, 480, 720].map((minutos) => (
                  <option key={minutos} value={minutos}>
                    {minutosATexto(minutos)}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="text-xs font-medium text-[#14477E] underline"
              onClick={() => setFiltros(FILTROS_INICIALES)}
              type="button"
            >
              Limpiar filtros
            </button>
          </div>

          <p className="mt-3 text-sm text-[#5A6B80]">
            {candidatas.length} vuelo{candidatas.length === 1 ? "" : "s"} de{" "}
            {nombreTramo(paso, tramos).toLowerCase()} disponibles con lo que ya
            elegiste
          </p>

          {candidatas.length === 0 ? (
            <p className="mt-3 rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm text-[#5A6B80]">
              Ningún vuelo cumple esos filtros. Suelta alguno o cambia el tramo
              anterior.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {candidatas.slice(0, visibles).map(({ opcion, precio }) => {
                const tramo = opcion.tramo;
                const ultimo = tramo.segmentos[tramo.segmentos.length - 1];
                const diferencia = precio - precioBase;
                return (
                  <li
                    className="flex flex-col gap-3 rounded-xl border border-[#E4E8EE] bg-white p-4 sm:flex-row sm:items-center"
                    key={opcion.id}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="text-lg font-semibold tabular-nums text-[#0B2545]">
                          {horaCorta(tramo.segmentos[0].sale)}
                          <span className="mx-2 text-[#9AA7B8]">–</span>
                          {horaCorta(ultimo.llega)}
                        </span>
                        <span className="text-sm text-[#5A6B80]">
                          <Bandera bandera={tramo.origenBandera} />{" "}
                          {tramo.origen} →{" "}
                          <Bandera bandera={tramo.destinoBandera} />{" "}
                          {tramo.destino} · {minutosATexto(tramo.minutos)}
                        </span>
                        <span className="rounded-full bg-[#E4E8EE] px-2 py-0.5 text-xs font-medium text-[#14477E]">
                          {tramo.segmentos.map((s) => s.vuelo).join(" + ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#5A6B80]">
                        {fechaCorta(tramo.segmentos[0].sale)} ·{" "}
                        {tramo.escalas === 0
                          ? "directo"
                          : tramo.segmentos
                              .slice(1)
                              .map(
                                (s) =>
                                  `${minutosATexto(s.esperaMinutos ?? 0)} en ${s.origen}` +
                                  (s.origenCiudad
                                    ? ` (${s.origenCiudad})`
                                    : ""),
                              )
                              .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-[#5A6B80]">
                        {tramo.segmentos
                          .map((s) => `${s.aerolinea} ${s.vuelo}`)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-[#E4E8EE] pt-3 sm:w-44 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                      <div className="text-right">
                        <p className="text-base font-semibold text-[#0B2545]">
                          {diferencia <= 0
                            ? `desde ${precio.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`
                            : `+ ${diferencia.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`}
                        </p>
                        <p className="text-xs text-[#5A6B80]">
                          total del viaje{" "}
                          {precio.toLocaleString("es-MX", {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <button
                        className="rounded-lg bg-[#14477E] px-4 py-2 text-sm font-semibold text-white"
                        onClick={() => elegirOpcion(paso, opcion.id)}
                        type="button"
                      >
                        Elegir
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {candidatas.length > visibles && (
            <button
              className="mt-4 w-full rounded-lg border border-[#14477E] px-4 py-2.5 text-sm font-semibold text-[#14477E]"
              onClick={() => setVisibles((v) => v + 12)}
              type="button"
            >
              Ver más vuelos ({candidatas.length - visibles} restantes)
            </button>
          )}
        </>
      )}

      {completo && (
        <>
          <p className="mt-4 text-sm text-[#5A6B80]">
            Tu itinerario ya está armado. Elige la tarifa con la que quieres
            comprarlo:
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {tarifas.map((combo) => (
              <li
                className="flex flex-col gap-3 rounded-xl border border-[#E4E8EE] bg-white p-4 sm:flex-row sm:items-center"
                key={combo.ofertaId}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#0B2545]">
                    {aerolineas[combo.aerolineaIata]?.nombre ??
                      combo.aerolineaIata}
                    {combo.marcaTarifa ? ` · ${combo.marcaTarifa}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-[#5A6B80]">
                    {combo.conMaleta
                      ? "Incluye maleta documentada"
                      : "Sólo equipaje de mano"}
                    {combo.cambiosPermitidos === true
                      ? " · permite cambios"
                      : ""}
                    {combo.reembolsoPermitido === true ? " · reembolsable" : ""}
                  </p>
                  {mostrarMargen && (
                    <p className="mt-1 text-xs text-[#9AA7B8]">
                      neto{" "}
                      {combo.costoNeto.toLocaleString("es-MX", {
                        maximumFractionDigits: 2,
                      })}{" "}
                      + markup{" "}
                      {combo.markup.toLocaleString("es-MX", {
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[#E4E8EE] pt-3 sm:w-52 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <p className="text-xl font-semibold text-[#0B2545]">
                    {combo.precioVenta.toLocaleString("es-MX", {
                      maximumFractionDigits: 2,
                    })}
                    <span className="ml-1 text-sm font-normal text-[#5A6B80]">
                      {moneda}
                    </span>
                  </p>
                  <button
                    className="rounded-lg bg-[#C9A227] px-4 py-2.5 text-sm font-semibold text-[#0B2545] disabled:opacity-60"
                    disabled={cargando}
                    onClick={() => onElegir(combo.ofertaId)}
                    type="button"
                  >
                    {cargando ? "Confirmando…" : "Continuar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            className="mt-4 text-sm font-medium text-[#14477E] underline"
            onClick={() => limpiarDesde(0)}
            type="button"
          >
            Armar otro itinerario
          </button>
        </>
      )}
    </section>
  );
}
