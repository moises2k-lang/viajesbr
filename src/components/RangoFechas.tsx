"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface Props {
  desde: string;
  hasta: string | null;
  conRegreso: boolean;
  /** Una sola fecha (tramos de multiciudad): oculta el campo de regreso. */
  unica?: boolean;
  etiquetaDesde?: string;
  etiquetaHasta?: string;
  onCambio: (desde: string, hasta: string | null) => void;
}

function aIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function hoyIso(): string {
  const ahora = new Date();
  return aIso(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

/** Casillas del mes: null para los huecos antes del día 1 (semana inicia lunes). */
function casillas(anio: number, mes: number): (number | null)[] {
  const primero = new Date(anio, mes, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const dias = new Date(anio, mes + 1, 0).getDate();
  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: dias }, (_, i) => i + 1),
  ];
}

const LUNES_BASE = new Date(2020, 5, 1); // 1 de junio de 2020 fue lunes

export default function RangoFechas({
  desde,
  hasta,
  conRegreso,
  unica = false,
  etiquetaDesde,
  etiquetaHasta,
  onCambio,
}: Props) {
  const { t, locale } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [eligiendo, setEligiendo] = useState<"desde" | "hasta">("desde");
  const [encima, setEncima] = useState<string | null>(null);
  const inicial = desde || hoyIso();
  const [mesBase, setMesBase] = useState(() => {
    const [anio, mes] = inicial.split("-").map(Number);
    return { anio, mes: mes - 1 };
  });
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (
        contenedor.current &&
        !contenedor.current.contains(evento.target as Node)
      ) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function abrir(campo: "desde" | "hasta") {
    setEligiendo(campo);
    setAbierto(true);
  }

  /** El calendario no se cierra al elegir: se queda abierto hasta que el usuario lo cierra. */
  function elegir(iso: string) {
    if (!conRegreso) {
      onCambio(iso, null);
      return;
    }
    if (eligiendo === "desde") {
      onCambio(iso, hasta && hasta >= iso ? hasta : null);
      setEligiendo("hasta");
      return;
    }
    if (iso < desde) {
      onCambio(iso, null);
      setEligiendo("hasta");
      return;
    }
    onCambio(desde, iso);
    setEligiendo("desde");
  }

  function mover(saltos: number) {
    const fecha = new Date(mesBase.anio, mesBase.mes + saltos, 1);
    setMesBase({ anio: fecha.getFullYear(), mes: fecha.getMonth() });
  }

  const minimo = hoyIso();
  const noches =
    desde !== "" && hasta
      ? Math.round(
          (new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000,
        )
      : 0;

  const formatoFecha = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  function textoLargo(iso: string): string {
    const [anio, mes, dia] = iso.split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return formatoFecha.format(fecha);
  }

  const formatoMes = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
  });

  const formatoDia = new Intl.DateTimeFormat(locale, { weekday: "short" });

  const cabecerasDias = Array.from({ length: 7 }, (_, i) =>
    formatoDia.format(new Date(LUNES_BASE.getTime() + i * 86400000)),
  );

  function mes(desplazamiento: number) {
    const fecha = new Date(mesBase.anio, mesBase.mes + desplazamiento, 1);
    const anio = fecha.getFullYear();
    const numeroMes = fecha.getMonth();

    return (
      <div className="w-64" key={`${anio}-${numeroMes}`}>
        <p className="mb-2 text-center text-sm font-semibold capitalize text-[#0B2545]">
          {formatoMes.format(fecha)}
        </p>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] uppercase text-[#9AA7B8]">
          {cabecerasDias.map((dia) => (
            <span key={dia}>{dia}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 place-items-center">
          {casillas(anio, numeroMes).map((dia, indice) => {
            if (dia === null) return <span key={`hueco-${indice}`} />;
            const iso = aIso(anio, numeroMes, dia);
            const pasada = iso < minimo;
            /** Mientras elige el regreso, el rango se sombrea siguiendo el cursor. */
            const finVista =
              hasta ??
              (conRegreso && eligiendo === "hasta" && encima && encima > desde
                ? encima
                : null);
            const esDesde = iso === desde;
            const esHasta = finVista !== null && iso === finVista;
            const enRango =
              finVista !== null &&
              desde !== "" &&
              iso > desde &&
              iso < finVista;
            const extremo = esDesde || esHasta;
            return (
              <button
                className={`h-9 text-sm ${
                  enRango ||
                  (extremo && finVista !== null && desde !== finVista)
                    ? "bg-[#DCE6F5]"
                    : ""
                } ${esDesde && finVista !== null && desde !== finVista ? "rounded-l-full" : ""} ${
                  esHasta && desde !== finVista ? "rounded-r-full" : ""
                } disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#D7DDE5]`}
                disabled={pasada}
                key={iso}
                onClick={() => elegir(iso)}
                onMouseEnter={() => setEncima(iso)}
                type="button"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    extremo
                      ? "bg-[#0B2545] font-semibold text-white"
                      : enRango
                        ? "text-[#0B2545]"
                        : "text-[#0B2545] hover:bg-[#F5F7FA]"
                  }`}
                >
                  {dia}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const claseCampo =
    "mt-1 inline-flex w-full min-w-0 items-center gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none";

  const labelDesde = etiquetaDesde ?? t("common.from");
  const labelHasta = etiquetaHasta ?? t("common.to");

  return (
    <div className="relative" ref={contenedor}>
      <div className={`grid min-w-0 gap-2 ${unica ? "grid-cols-1" : "grid-cols-2"}`}>
        <div className="min-w-0">
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            {labelDesde}
          </span>
          <button
            className={`${claseCampo} ${
              abierto && eligiendo === "desde"
                ? "border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
                : "border-[#E4E8EE]"
            }`}
            onClick={() => abrir("desde")}
            type="button"
          >
            <Calendar className="h-4 w-4 shrink-0 text-[#5A6B80]" />
            <span className="truncate">
              {desde ? textoLargo(desde) : t("search.chooseDate")}
            </span>
          </button>
        </div>
        {!unica && (
          <div className="min-w-0">
            <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
              {labelHasta}
            </span>
            <button
              className={`${claseCampo} disabled:cursor-not-allowed disabled:bg-[#F5F7FA] disabled:text-[#9AA7B8] ${
                abierto && eligiendo === "hasta"
                  ? "border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
                  : "border-[#E4E8EE]"
              }`}
              disabled={!conRegreso}
              onClick={() => abrir("hasta")}
              type="button"
            >
              <Calendar className="h-4 w-4 shrink-0 text-[#5A6B80]" />
              <span className="truncate">
                {conRegreso
                  ? hasta
                    ? textoLargo(hasta)
                    : t("search.chooseDate")
                  : t("common.oneWay")}
              </span>
            </button>
          </div>
        )}
      </div>

      {abierto && (
        <div className="absolute z-30 mt-1 rounded-xl border border-[#E4E8EE] bg-white p-4 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              className="h-7 w-7 rounded-full border border-[#E4E8EE] text-sm text-[#14477E]"
              onClick={() => mover(-1)}
              type="button"
            >
              ‹
            </button>
            <span className="text-xs text-[#5A6B80]">
              {conRegreso
                ? eligiendo === "desde"
                  ? t("search.chooseDepartureDate")
                  : t("search.chooseReturnDate")
                : t("search.chooseDepartureDate")}
            </span>
            <button
              className="h-7 w-7 rounded-full border border-[#E4E8EE] text-sm text-[#14477E]"
              onClick={() => mover(1)}
              type="button"
            >
              ›
            </button>
          </div>
          <div
            className="flex flex-col gap-6 sm:flex-row"
            onMouseLeave={() => setEncima(null)}
          >
            {mes(0)}
            {mes(1)}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E4E8EE] pt-3">
            <p className="text-xs text-[#5A6B80]">
              {desde === ""
                ? t("search.chooseDepartureDate")
                : conRegreso && hasta
                  ? `${textoLargo(desde)} → ${textoLargo(hasta)} · ${noches} ${noches === 1 ? t("common.night") : t("common.nights")}`
                  : conRegreso
                    ? `${textoLargo(desde)} → ${t("search.chooseReturn")}`
                    : textoLargo(desde)}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#E4E8EE] px-3 py-1.5 text-xs text-[#5A6B80]"
                onClick={() => {
                  onCambio("", null);
                  setEligiendo("desde");
                }}
                type="button"
              >
                {t("common.clear")}
              </button>
              <button
                className="rounded-lg bg-[#0B2545] px-4 py-1.5 text-xs font-semibold text-white"
                onClick={() => setAbierto(false)}
                type="button"
              >
                {t("common.done")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
