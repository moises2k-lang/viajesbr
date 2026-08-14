"use client";

import { useMemo, useState } from "react";
import type {
  AerolineaResumen,
  CombinacionTramos,
  OfertaConPrecio,
  OpcionTramo,
} from "@/app/api/buscar/route";
import ArmarVuelo from "@/components/ArmarVuelo";
import TarjetaOferta, { minutosATexto } from "@/components/TarjetaOferta";
import { FRANJAS, dentroDeFranjas, franjaDe } from "@/lib/franjas";

type GrupoHorario = "franjasSalida" | "franjasLlegada" | "franjasRegreso";

type Orden = "mejor" | "precio" | "duracion" | "salida";

interface Filtros {
  escalasMaximas: number | null;
  aerolineas: string[];
  soloConMaleta: boolean;
  franjasSalida: number[];
  franjasLlegada: number[];
  franjasRegreso: number[];
  duracionMaxima: number | null;
  precioMaximo: number | null;
  escalaEn: string[];
  vuelo: string;
}

const FILTROS_INICIALES: Filtros = {
  escalasMaximas: null,
  aerolineas: [],
  soloConMaleta: false,
  franjasSalida: [],
  franjasLlegada: [],
  franjasRegreso: [],
  duracionMaxima: null,
  precioMaximo: null,
  escalaEn: [],
  vuelo: "",
};

/** Escalones redondos de precio, para no depender de un deslizador imposible de atinar. */
function escalonesDePrecio(minimo: number, maximo: number): number[] {
  const paso = Math.max(
    100,
    Math.round((maximo - minimo) / 6 / 100) * 100 || 100,
  );
  const escalones: number[] = [];
  for (
    let monto = Math.ceil(minimo / paso) * paso;
    monto < maximo && escalones.length < 8;
    monto += paso
  ) {
    escalones.push(monto);
  }
  return escalones;
}

function escalasDeOferta(oferta: OfertaConPrecio): string[] {
  return oferta.tramos.flatMap((tramo) =>
    tramo.segmentos.slice(0, -1).map((s) => s.destino),
  );
}

function vuelosDeOferta(oferta: OfertaConPrecio): string[] {
  return oferta.tramos.flatMap((tramo) =>
    tramo.segmentos.map((s) => s.vuelo.toUpperCase()),
  );
}

function horaDeSalida(oferta: OfertaConPrecio): number {
  const fecha = new Date(oferta.tramos[0].segmentos[0].sale);
  return fecha.getHours() + fecha.getMinutes() / 60;
}

function salidaIda(oferta: OfertaConPrecio): string {
  return oferta.tramos[0].segmentos[0].sale;
}

function llegadaIda(oferta: OfertaConPrecio): string {
  const tramo = oferta.tramos[0];
  return tramo.segmentos[tramo.segmentos.length - 1].llega;
}

function salidaRegreso(oferta: OfertaConPrecio): string | null {
  if (oferta.tramos.length < 2) return null;
  return oferta.tramos[oferta.tramos.length - 1].segmentos[0].sale;
}

function horarioDelGrupo(
  oferta: OfertaConPrecio,
  grupo: GrupoHorario,
): string | null {
  if (grupo === "franjasSalida") return salidaIda(oferta);
  if (grupo === "franjasLlegada") return llegadaIda(oferta);
  return salidaRegreso(oferta);
}

function cumple(oferta: OfertaConPrecio, filtros: Filtros): boolean {
  if (
    filtros.escalasMaximas !== null &&
    escalasMaximas(oferta) > filtros.escalasMaximas
  ) {
    return false;
  }
  if (
    filtros.aerolineas.length > 0 &&
    !filtros.aerolineas.includes(oferta.aerolineaIata)
  ) {
    return false;
  }
  if (filtros.soloConMaleta && !tieneMaleta(oferta)) return false;
  if (!dentroDeFranjas(salidaIda(oferta), filtros.franjasSalida)) return false;
  if (!dentroDeFranjas(llegadaIda(oferta), filtros.franjasLlegada))
    return false;
  const regreso = salidaRegreso(oferta);
  if (regreso !== null && !dentroDeFranjas(regreso, filtros.franjasRegreso)) {
    return false;
  }
  if (
    filtros.duracionMaxima !== null &&
    duracionTotal(oferta) > filtros.duracionMaxima
  ) {
    return false;
  }
  if (
    filtros.precioMaximo !== null &&
    oferta.precioVenta > filtros.precioMaximo
  ) {
    return false;
  }
  if (filtros.escalaEn.length > 0) {
    const escalas = escalasDeOferta(oferta);
    if (!escalas.some((codigo) => filtros.escalaEn.includes(codigo))) {
      return false;
    }
  }
  const buscado = filtros.vuelo.trim().toUpperCase().replace(/\s+/g, "");
  if (buscado !== "") {
    const vuelos = vuelosDeOferta(oferta);
    const pedidos = buscado.split(",").filter(Boolean);
    if (!pedidos.every((pedido) => vuelos.some((v) => v.includes(pedido)))) {
      return false;
    }
  }
  return true;
}

function escalasMaximas(oferta: OfertaConPrecio): number {
  return Math.max(...oferta.tramos.map((t) => t.escalas));
}

function duracionTotal(oferta: OfertaConPrecio): number {
  return oferta.tramos.reduce((suma, tramo) => suma + tramo.minutos, 0);
}

function tieneMaleta(oferta: OfertaConPrecio): boolean {
  return oferta.tramos.every((tramo) =>
    tramo.equipaje.some((e) => e.tipo === "checked" && e.cantidad > 0),
  );
}

function puntaje(
  oferta: OfertaConPrecio,
  precioMinimo: number,
  duracionMinima: number,
): number {
  const relPrecio = oferta.precioVenta / precioMinimo;
  const relDuracion = duracionTotal(oferta) / duracionMinima;
  return relPrecio * 0.65 + relDuracion * 0.35;
}

interface Props {
  ofertas: OfertaConPrecio[];
  total: number;
  mostrarMargen: boolean;
  opcionesTramo: OpcionTramo[];
  combinaciones: CombinacionTramos[];
  aerolineasCombinaciones: Record<string, AerolineaResumen>;
  tramosBuscados: number;
  resolviendo: boolean;
  onElegir: (oferta: OfertaConPrecio) => void;
  onElegirCombinacion: (ofertaId: string) => void;
}

export default function ListaOfertas({
  ofertas,
  total,
  mostrarMargen,
  opcionesTramo,
  combinaciones,
  aerolineasCombinaciones,
  tramosBuscados,
  resolviendo,
  onElegir,
  onElegirCombinacion,
}: Props) {
  const [orden, setOrden] = useState<Orden>("mejor");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [visibles, setVisibles] = useState(15);
  const [modo, setModo] = useState<"tarifas" | "tramos">("tarifas");

  const aerolineas = useMemo(() => {
    const mapa = new Map<string, { nombre: string; minimo: number }>();
    for (const oferta of ofertas) {
      const actual = mapa.get(oferta.aerolineaIata);
      if (!actual || oferta.precioVenta < actual.minimo) {
        mapa.set(oferta.aerolineaIata, {
          nombre: oferta.aerolinea,
          minimo: oferta.precioVenta,
        });
      }
    }
    return [...mapa.entries()].sort((a, b) => a[1].minimo - b[1].minimo);
  }, [ofertas]);

  const precioMinimo = useMemo(
    () => Math.min(...ofertas.map((o) => o.precioVenta)),
    [ofertas],
  );
  const precioMaximoDisponible = useMemo(
    () => Math.max(...ofertas.map((o) => o.precioVenta)),
    [ofertas],
  );
  const escalasDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const oferta of ofertas) {
      for (const tramo of oferta.tramos) {
        for (const segmento of tramo.segmentos.slice(0, -1)) {
          mapa.set(
            segmento.destino,
            segmento.destinoCiudad ?? segmento.destinoNombre,
          );
        }
      }
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ofertas]);

  const duracionMinima = useMemo(
    () => Math.min(...ofertas.map(duracionTotal)),
    [ofertas],
  );
  const duracionMaximaDisponible = useMemo(
    () => Math.max(...ofertas.map(duracionTotal)),
    [ofertas],
  );

  const filtradas = useMemo(() => {
    const lista = ofertas.filter((oferta) => cumple(oferta, filtros));

    return lista.sort((a, b) => {
      if (orden === "precio") return a.precioVenta - b.precioVenta;
      if (orden === "duracion") return duracionTotal(a) - duracionTotal(b);
      if (orden === "salida") return horaDeSalida(a) - horaDeSalida(b);
      return (
        puntaje(a, precioMinimo, duracionMinima) -
        puntaje(b, precioMinimo, duracionMinima)
      );
    });
  }, [ofertas, filtros, orden, precioMinimo, duracionMinima]);

  /** Cada franja muestra cuántos vuelos deja, ignorando su propio grupo. */
  const conteoHorarios = useMemo(() => {
    const grupos: GrupoHorario[] = [
      "franjasSalida",
      "franjasLlegada",
      "franjasRegreso",
    ];
    const conteo = {} as Record<GrupoHorario, number[]>;
    for (const grupo of grupos) {
      const cuenta = FRANJAS.map(() => 0);
      for (const oferta of ofertas) {
        if (!cumple(oferta, { ...filtros, [grupo]: [] })) continue;
        const momento = horarioDelGrupo(oferta, grupo);
        if (momento === null) continue;
        const indice = franjaDe(momento);
        if (indice >= 0) cuenta[indice] += 1;
      }
      conteo[grupo] = cuenta;
    }
    return conteo;
  }, [ofertas, filtros]);

  const hayRegreso = ofertas.some((oferta) => oferta.tramos.length >= 2);

  function alternarFranja(grupo: GrupoHorario, indice: number) {
    const actuales = filtros[grupo];
    setFiltros({
      ...filtros,
      [grupo]: actuales.includes(indice)
        ? actuales.filter((i) => i !== indice)
        : [...actuales, indice],
    });
  }

  if (ofertas.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm text-[#5A6B80]">
        Ninguna aerolínea devolvió tarifas para esa combinación.
      </p>
    );
  }

  const puedeArmar = tramosBuscados >= 2 && opcionesTramo.length > 0;

  return (
    <>
      {puedeArmar && (
        <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#E4E8EE] bg-white p-3">
          <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
            {[
              { valor: "tarifas" as const, texto: "Tarifas completas" },
              {
                valor: "tramos" as const,
                texto:
                  tramosBuscados === 2
                    ? "Elegir ida y regreso"
                    : "Elegir tramo por tramo",
              },
            ].map((opcion) => (
              <button
                className={`rounded-full px-3 py-1.5 font-medium ${
                  modo === opcion.valor
                    ? "bg-white text-[#0B2545] shadow"
                    : "text-[#5A6B80]"
                }`}
                key={opcion.valor}
                onClick={() => setModo(opcion.valor)}
                type="button"
              >
                {opcion.texto}
              </button>
            ))}
          </div>
          <p className="min-w-0 flex-1 text-xs text-[#5A6B80]">
            {modo === "tarifas"
              ? "Cada tarjeta es una combinación completa tal como la vende la aerolínea."
              : `Eliges el vuelo de cada tramo por separado, con sus escalas y números de vuelo; sólo se ofrecen enlaces que la aerolínea sí vende juntos (${combinaciones.length.toLocaleString("es-MX")} combinaciones).`}
          </p>
        </div>
      )}

      {puedeArmar && modo === "tramos" ? (
        <ArmarVuelo
          aerolineas={aerolineasCombinaciones}
          cargando={resolviendo}
          combinaciones={combinaciones}
          moneda={ofertas[0]?.moneda ?? "USD"}
          mostrarMargen={mostrarMargen}
          opciones={opcionesTramo}
          tramos={tramosBuscados}
          onElegir={onElegirCombinacion}
        />
      ) : (
        <section className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <aside className="h-fit rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm lg:sticky lg:top-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0B2545]">Filtros</h3>
              <button
                className="text-xs text-[#14477E] underline"
                onClick={() => setFiltros(FILTROS_INICIALES)}
                type="button"
              >
                Limpiar
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Escalas
              </p>
              <div className="mt-2 flex flex-col gap-1">
                {[
                  { texto: "Cualquiera", valor: null },
                  { texto: "Directo", valor: 0 },
                  { texto: "Máximo 1 escala", valor: 1 },
                  { texto: "Máximo 2 escalas", valor: 2 },
                ].map((opcion) => (
                  <label
                    className="flex items-center gap-2 text-[#0B2545]"
                    key={String(opcion.valor)}
                  >
                    <input
                      checked={filtros.escalasMaximas === opcion.valor}
                      name="escalas"
                      onChange={() =>
                        setFiltros({ ...filtros, escalasMaximas: opcion.valor })
                      }
                      type="radio"
                    />
                    {opcion.texto}
                  </label>
                ))}
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 text-[#0B2545]">
              <input
                checked={filtros.soloConMaleta}
                onChange={(e) =>
                  setFiltros({ ...filtros, soloConMaleta: e.target.checked })
                }
                type="checkbox"
              />
              Sólo con maleta documentada
            </label>

            {(
              [
                { grupo: "franjasSalida" as const, texto: "Salida de la ida" },
                {
                  grupo: "franjasLlegada" as const,
                  texto: "Llegada al destino",
                },
                ...(hayRegreso
                  ? [
                      {
                        grupo: "franjasRegreso" as const,
                        texto: "Salida del regreso",
                      },
                    ]
                  : []),
              ] as { grupo: GrupoHorario; texto: string }[]
            ).map(({ grupo, texto }) => (
              <div className="mt-4" key={grupo}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                  {texto}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {FRANJAS.map((franja, indice) => {
                    const cantidad = conteoHorarios[grupo][indice];
                    const activo = filtros[grupo].includes(indice);
                    return (
                      <button
                        className={`rounded-lg border px-2 py-1.5 text-left text-xs disabled:opacity-40 ${
                          activo
                            ? "border-[#14477E] bg-[#14477E] text-white"
                            : "border-[#E4E8EE] text-[#0B2545]"
                        }`}
                        disabled={cantidad === 0 && !activo}
                        key={franja.texto}
                        onClick={() => alternarFranja(grupo, indice)}
                        type="button"
                      >
                        <span className="block font-medium">
                          {franja.texto}
                        </span>
                        <span
                          className={
                            activo ? "text-white/80" : "text-[#5A6B80]"
                          }
                        >
                          {franja.detalle} · {cantidad}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Duración máxima del viaje
              </span>
              <select
                className="mt-2 w-full rounded-lg border border-[#E4E8EE] px-3 py-1.5"
                onChange={(e) =>
                  setFiltros({
                    ...filtros,
                    duracionMaxima:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                value={filtros.duracionMaxima ?? ""}
              >
                <option value="">Sin límite</option>
                {[6, 9, 12, 18, 24, 36, 48]
                  .map((horas) => horas * 60)
                  .filter(
                    (minutos) =>
                      minutos >= duracionMinima &&
                      minutos <= duracionMaximaDisponible,
                  )
                  .map((minutos) => (
                    <option key={minutos} value={minutos}>
                      hasta {minutosATexto(minutos)}
                    </option>
                  ))}
              </select>
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Precio máximo
              </span>
              <select
                className="mt-2 w-full rounded-lg border border-[#E4E8EE] px-3 py-1.5"
                onChange={(e) =>
                  setFiltros({
                    ...filtros,
                    precioMaximo:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                value={filtros.precioMaximo ?? ""}
              >
                <option value="">Sin límite</option>
                {escalonesDePrecio(precioMinimo, precioMaximoDisponible).map(
                  (monto) => (
                    <option key={monto} value={monto}>
                      hasta{" "}
                      {monto.toLocaleString("es-MX", {
                        maximumFractionDigits: 0,
                      })}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Número de vuelo
              </p>
              <input
                className="mt-2 w-full min-w-0 rounded-lg border border-[#E4E8EE] px-3 py-1.5"
                onChange={(e) =>
                  setFiltros({ ...filtros, vuelo: e.target.value })
                }
                placeholder="AV73, AV87"
                value={filtros.vuelo}
              />
            </div>

            {escalasDisponibles.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                  Escala en
                </p>
                <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-auto">
                  {escalasDisponibles.map(([codigo, ciudad]) => (
                    <label
                      className="flex min-w-0 items-center gap-2 text-[#0B2545]"
                      key={codigo}
                    >
                      <input
                        checked={filtros.escalaEn.includes(codigo)}
                        onChange={(e) =>
                          setFiltros({
                            ...filtros,
                            escalaEn: e.target.checked
                              ? [...filtros.escalaEn, codigo]
                              : filtros.escalaEn.filter((c) => c !== codigo),
                          })
                        }
                        type="checkbox"
                      />
                      <span className="truncate">
                        {codigo} · {ciudad}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
                Aerolínea
              </p>
              <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-auto">
                {aerolineas.map(([iata, datos]) => (
                  <label
                    className="flex items-center justify-between gap-2 text-[#0B2545]"
                    key={iata}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        checked={filtros.aerolineas.includes(iata)}
                        onChange={(e) =>
                          setFiltros({
                            ...filtros,
                            aerolineas: e.target.checked
                              ? [...filtros.aerolineas, iata]
                              : filtros.aerolineas.filter((a) => a !== iata),
                          })
                        }
                        type="checkbox"
                      />
                      <span className="truncate">{datos.nombre}</span>
                    </span>
                    <span className="text-xs text-[#5A6B80]">
                      {datos.minimo.toLocaleString("es-MX", {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#5A6B80]">
                {total.toLocaleString("es-MX")} tarifas encontradas ·{" "}
                {filtradas.length} cumplen tus filtros
              </p>
              <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
                {[
                  { valor: "mejor" as Orden, texto: "Mejor opción" },
                  { valor: "precio" as Orden, texto: "Más barato" },
                  { valor: "duracion" as Orden, texto: "Más rápido" },
                  { valor: "salida" as Orden, texto: "Salida" },
                ].map((opcion) => (
                  <button
                    className={`rounded-full px-3 py-1.5 font-medium ${
                      orden === opcion.valor
                        ? "bg-white text-[#0B2545] shadow"
                        : "text-[#5A6B80]"
                    }`}
                    key={opcion.valor}
                    onClick={() => setOrden(opcion.valor)}
                    type="button"
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
            </div>

            {filtradas.length === 0 ? (
              <p className="rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm text-[#5A6B80]">
                Ninguna tarifa cumple esos filtros. Suelta alguno para ver
                opciones.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {filtradas.slice(0, visibles).map((oferta) => (
                  <TarjetaOferta
                    key={oferta.ofertaId}
                    mostrarMargen={mostrarMargen}
                    oferta={oferta}
                    onElegir={onElegir}
                  />
                ))}
              </ul>
            )}

            {filtradas.length > visibles && (
              <button
                className="mt-4 w-full rounded-lg border border-[#14477E] px-4 py-2.5 text-sm font-semibold text-[#14477E]"
                onClick={() => setVisibles((v) => v + 15)}
                type="button"
              >
                Ver más opciones ({filtradas.length - visibles} restantes)
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
