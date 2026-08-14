"use client";

import { useState } from "react";
import { ChevronDown, History, Trash2 } from "lucide-react";
import { TextoConBandera } from "@/components/Bandera";
import type { ParametrosFormulario } from "@/components/Buscador";
import type { BusquedaGuardada } from "@/lib/historial";
import { useI18n } from "@/lib/i18n";

interface Props {
  historial: BusquedaGuardada[];
  onRepetir: (parametros: ParametrosFormulario) => void;
  onBorrar: () => void;
}

export default function HistorialBusquedas({
  historial,
  onRepetir,
  onBorrar,
}: Props) {
  const { t, locale } = useI18n();
  const [abierto, setAbierto] = useState(false);

  const formatoCorto = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
  });

  function fechaCorta(iso: string): string {
    const [anio, mes, dia] = iso.split("-").map(Number);
    return formatoCorto.format(new Date(anio, mes - 1, dia));
  }

  function textoPasajeros(p: ParametrosFormulario): string {
    const partes = [
      `${p.adultos} ${p.adultos === 1 ? t("common.adult") : t("common.adults")}`,
    ];
    if (p.menores.length > 0) {
      partes.push(
        `${p.menores.length} ${p.menores.length === 1 ? t("common.child") : t("common.children")} (${p.menores.join(", ")} ${t("common.years")})`,
      );
    }
    if (p.bebes > 0) {
      partes.push(
        `${p.bebes} ${p.bebes === 1 ? t("common.infant") : t("common.infants")}`,
      );
    }
    return partes.join(" · ");
  }

  if (historial.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-[#E4E8EE] bg-white">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-[#0B2545]"
        onClick={() => setAbierto((a) => !a)}
        type="button"
      >
        <span className="inline-flex items-center gap-2">
          <History className="h-4 w-4" /> {t("common.recentSearches")}
        </span>
        <ChevronDown className={`h-4 w-4 transition ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && (
        <div className="border-t border-[#E4E8EE] px-4 pb-4 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[#5A6B80]">
              {historial.length} {t("search.saved")}
            </span>
            <button
              className="inline-flex items-center gap-1 text-xs text-[#B4451F] hover:text-[#96381A]"
              onClick={onBorrar}
              type="button"
            >
              <Trash2 className="h-3 w-3" /> {t("common.clearHistory")}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
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
                    {p.tramos && p.tramos.length > 1
                      ? [
                          p.tramos[0].origen,
                          ...p.tramos.map((tr) => tr.destino),
                        ].join(" → ")
                      : `${p.origen} → ${p.destino}`}
                  </p>
                  <p className="text-xs text-[#5A6B80]">
                    {p.origenNombre || p.destinoNombre ? (
                      <>
                        <TextoConBandera texto={p.origenNombre ?? ""} />
                        {p.origenNombre && p.destinoNombre ? " → " : ""}
                        <TextoConBandera texto={p.destinoNombre ?? ""} />
                      </>
                    ) : (
                      t("search.savedFlight")
                    )}
                  </p>
                  <p className="mt-1 text-xs text-[#5A6B80]">
                    {fechaCorta(p.fechaSalida)}
                    {p.tramos && p.tramos.length > 1
                      ? ` · ${t("common.multiCity")} (${p.tramos.length} ${p.tramos.length === 1 ? t("search.segment") : t("search.segments")})`
                      : p.fechaRegreso
                        ? ` – ${fechaCorta(p.fechaRegreso)}`
                        : ` · ${t("common.oneWay")}`}
                  </p>
                  <p className="text-xs text-[#5A6B80]">{textoPasajeros(p)}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
