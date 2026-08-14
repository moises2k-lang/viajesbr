"use client";

import { useMemo, useState } from "react";
import type { OfertaConPrecio } from "@/app/api/buscar/route";
import TarjetaOferta, { minutosATexto } from "@/components/TarjetaOferta";

type Orden = "mejor" | "precio" | "duracion" | "salida";

interface Filtros {
  escalasMaximas: number | null;
  aerolineas: string[];
  soloConMaleta: boolean;
  salidaDesde: number;
  salidaHasta: number;
  duracionMaxima: number | null;
  precioMaximo: number | null;
}

const FILTROS_INICIALES: Filtros = {
  escalasMaximas: null,
  aerolineas: [],
  soloConMaleta: false,
  salidaDesde: 0,
  salidaHasta: 24,
  duracionMaxima: null,
  precioMaximo: null,
};

function horaDeSalida(oferta: OfertaConPrecio): number {
  const fecha = new Date(oferta.tramos[0].segmentos[0].sale);
  return fecha.getHours() + fecha.getMinutes() / 60;
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

function puntaje(oferta: OfertaConPrecio, precioMinimo: number, duracionMinima: number): number {
  const relPrecio = oferta.precioVenta / precioMinimo;
  const relDuracion = duracionTotal(oferta) / duracionMinima;
  return relPrecio * 0.65 + relDuracion * 0.35;
}

interface Props {
  ofertas: OfertaConPrecio[];
  total: number;
  onElegir: (oferta: OfertaConPrecio) => void;
}

export default function ListaOfertas({ ofertas, total, onElegir }: Props) {
  const [orden, setOrden] = useState<Orden>("mejor");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [visibles, setVisibles] = useState(15);

  const aerolineas = useMemo(() => {
    const mapa = new Map<string, { nombre: string; minimo: number }>();
    for (const oferta of ofertas) {
      const actual = mapa.get(oferta.aerolineaIata);
      if (!actual || oferta.precioVenta < actual.minimo) {
        mapa.set(oferta.aerolineaIata, { nombre: oferta.aerolinea, minimo: oferta.precioVenta });
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
  const duracionMinima = useMemo(() => Math.min(...ofertas.map(duracionTotal)), [ofertas]);
  const duracionMaximaDisponible = useMemo(
    () => Math.max(...ofertas.map(duracionTotal)),
    [ofertas],
  );

  const filtradas = useMemo(() => {
    const lista = ofertas.filter((oferta) => {
      if (filtros.escalasMaximas !== null && escalasMaximas(oferta) > filtros.escalasMaximas) {
        return false;
      }
      if (filtros.aerolineas.length > 0 && !filtros.aerolineas.includes(oferta.aerolineaIata)) {
        return false;
      }
      if (filtros.soloConMaleta && !tieneMaleta(oferta)) return false;
      const salida = horaDeSalida(oferta);
      if (salida < filtros.salidaDesde || salida > filtros.salidaHasta) return false;
      if (filtros.duracionMaxima !== null && duracionTotal(oferta) > filtros.duracionMaxima) {
        return false;
      }
      if (filtros.precioMaximo !== null && oferta.precioVenta > filtros.precioMaximo) return false;
      return true;
    });

    return lista.sort((a, b) => {
      if (orden === "precio") return a.precioVenta - b.precioVenta;
      if (orden === "duracion") return duracionTotal(a) - duracionTotal(b);
      if (orden === "salida") return horaDeSalida(a) - horaDeSalida(b);
      return (
        puntaje(a, precioMinimo, duracionMinima) - puntaje(b, precioMinimo, duracionMinima)
      );
    });
  }, [ofertas, filtros, orden, precioMinimo, duracionMinima]);

  if (ofertas.length === 0) {
    return (
      <p className="mt-8 rounded-xl border border-[#E4E8EE] bg-white p-4 text-sm text-[#5A6B80]">
        Ninguna aerolínea devolvió tarifas para esa combinación.
      </p>
    );
  }

  return (
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
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">Escalas</p>
          <div className="mt-2 flex flex-col gap-1">
            {[
              { texto: "Cualquiera", valor: null },
              { texto: "Directo", valor: 0 },
              { texto: "Máximo 1 escala", valor: 1 },
              { texto: "Máximo 2 escalas", valor: 2 },
            ].map((opcion) => (
              <label className="flex items-center gap-2 text-[#0B2545]" key={String(opcion.valor)}>
                <input
                  checked={filtros.escalasMaximas === opcion.valor}
                  name="escalas"
                  onChange={() => setFiltros({ ...filtros, escalasMaximas: opcion.valor })}
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
            onChange={(e) => setFiltros({ ...filtros, soloConMaleta: e.target.checked })}
            type="checkbox"
          />
          Sólo con maleta documentada
        </label>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
            Hora de salida ({filtros.salidaDesde}:00 – {filtros.salidaHasta}:00)
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              className="w-full"
              max={24}
              min={0}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  salidaDesde: Math.min(Number(e.target.value), filtros.salidaHasta),
                })
              }
              type="range"
              value={filtros.salidaDesde}
            />
            <input
              className="w-full"
              max={24}
              min={0}
              onChange={(e) =>
                setFiltros({
                  ...filtros,
                  salidaHasta: Math.max(Number(e.target.value), filtros.salidaDesde),
                })
              }
              type="range"
              value={filtros.salidaHasta}
            />
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
            Duración máxima de vuelo{" "}
            {filtros.duracionMaxima !== null ? `(${minutosATexto(filtros.duracionMaxima)})` : ""}
          </p>
          <input
            className="mt-2 w-full"
            max={duracionMaximaDisponible}
            min={duracionMinima}
            onChange={(e) => setFiltros({ ...filtros, duracionMaxima: Number(e.target.value) })}
            step={30}
            type="range"
            value={filtros.duracionMaxima ?? duracionMaximaDisponible}
          />
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">
            Precio máximo{" "}
            {filtros.precioMaximo !== null
              ? `(${filtros.precioMaximo.toLocaleString("es-MX", { maximumFractionDigits: 0 })})`
              : ""}
          </p>
          <input
            className="mt-2 w-full"
            max={Math.ceil(precioMaximoDisponible)}
            min={Math.floor(precioMinimo)}
            onChange={(e) => setFiltros({ ...filtros, precioMaximo: Number(e.target.value) })}
            step={50}
            type="range"
            value={filtros.precioMaximo ?? Math.ceil(precioMaximoDisponible)}
          />
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5A6B80]">Aerolínea</p>
          <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-auto">
            {aerolineas.map(([iata, datos]) => (
              <label className="flex items-center justify-between gap-2 text-[#0B2545]" key={iata}>
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
                  {datos.minimo.toLocaleString("es-MX", { maximumFractionDigits: 0 })}
                </span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[#5A6B80]">
            {total.toLocaleString("es-MX")} tarifas encontradas · {filtradas.length} cumplen tus
            filtros
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
                  orden === opcion.valor ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"
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
            Ninguna tarifa cumple esos filtros. Suelta alguno para ver opciones.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {filtradas.slice(0, visibles).map((oferta) => (
              <TarjetaOferta key={oferta.ofertaId} oferta={oferta} onElegir={onElegir} />
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
  );
}
