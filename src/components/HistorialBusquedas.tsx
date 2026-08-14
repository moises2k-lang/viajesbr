"use client";

import type { ParametrosFormulario } from "@/components/Buscador";
import type { BusquedaGuardada } from "@/lib/historial";

interface Props {
  historial: BusquedaGuardada[];
  onRepetir: (parametros: ParametrosFormulario) => void;
  onBorrar: () => void;
}

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function fechaCorta(iso: string): string {
  const [, mes, dia] = iso.split("-").map(Number);
  return `${dia} ${MESES[mes - 1]}`;
}

function textoPasajeros(p: ParametrosFormulario): string {
  const partes = [`${p.adultos} adulto${p.adultos === 1 ? "" : "s"}`];
  if (p.menores.length > 0) {
    partes.push(`${p.menores.length} menor${p.menores.length === 1 ? "" : "es"} (${p.menores.join(", ")} años)`);
  }
  if (p.bebes > 0) partes.push(`${p.bebes} bebé${p.bebes === 1 ? "" : "s"}`);
  return partes.join(" · ");
}

export default function HistorialBusquedas({ historial, onRepetir, onBorrar }: Props) {
  if (historial.length === 0) return null;

  return (
    <section className="mt-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#0B2545]">Tus búsquedas recientes</h2>
        <button className="text-xs text-[#14477E] underline" onClick={onBorrar} type="button">
          Borrar historial
        </button>
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
        {historial.map((guardada) => {
          const p = guardada.parametros;
          return (
            <button
              className="min-w-56 shrink-0 rounded-xl border border-[#E4E8EE] bg-white p-3 text-left hover:border-[#14477E]"
              key={`${p.origen}-${p.destino}-${p.fechaSalida}-${guardada.buscadaEn}`}
              onClick={() => onRepetir(p)}
              type="button"
            >
              <p className="text-sm font-semibold text-[#0B2545]">
                {p.origen} → {p.destino}
              </p>
              <p className="text-xs text-[#5A6B80]">
                {[p.origenNombre, p.destinoNombre].filter(Boolean).join(" → ") || "Vuelo guardado"}
              </p>
              <p className="mt-1 text-xs text-[#5A6B80]">
                {fechaCorta(p.fechaSalida)}
                {p.fechaRegreso ? ` – ${fechaCorta(p.fechaRegreso)}` : " · sólo ida"}
              </p>
              <p className="text-xs text-[#5A6B80]">{textoPasajeros(p)}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
