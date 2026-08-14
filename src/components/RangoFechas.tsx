"use client";

import { useEffect, useRef, useState } from "react";

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

const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function aIso(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function hoyIso(): string {
  const ahora = new Date();
  return aIso(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}

function textoLargo(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  return `${DIAS[(fecha.getDay() + 6) % 7]} ${dia} ${MESES[mes - 1].slice(0, 3)} ${anio}`;
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

export default function RangoFechas({
  desde,
  hasta,
  conRegreso,
  unica = false,
  etiquetaDesde = "Desde",
  etiquetaHasta = "Hasta",
  onCambio,
}: Props) {
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

  function mes(desplazamiento: number) {
    const fecha = new Date(mesBase.anio, mesBase.mes + desplazamiento, 1);
    const anio = fecha.getFullYear();
    const numeroMes = fecha.getMonth();

    return (
      <div className="w-64" key={`${anio}-${numeroMes}`}>
        <p className="mb-2 text-center text-sm font-semibold capitalize text-[#0B2545]">
          {MESES[numeroMes]} {anio}
        </p>
        <div className="grid grid-cols-7 gap-y-1 text-center text-[10px] uppercase text-[#9AA7B8]">
          {DIAS.map((dia) => (
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

  return (
    <div className="relative" ref={contenedor}>
      <div className={`grid gap-2 ${unica ? "grid-cols-1" : "grid-cols-2"}`}>
        <button
          className={`rounded-lg border bg-white px-3 py-2.5 text-left ${
            abierto && eligiendo === "desde"
              ? "border-[#14477E]"
              : "border-[#E4E8EE]"
          }`}
          onClick={() => abrir("desde")}
          type="button"
        >
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            {etiquetaDesde}
          </span>
          <span className="text-sm font-medium text-[#0B2545]">
            {desde ? textoLargo(desde) : "Elegir fecha"}
          </span>
        </button>
        {!unica && (
          <button
            className={`rounded-lg border bg-white px-3 py-2.5 text-left disabled:bg-[#F5F7FA] ${
              abierto && eligiendo === "hasta"
                ? "border-[#14477E]"
                : "border-[#E4E8EE]"
            }`}
            disabled={!conRegreso}
            onClick={() => abrir("hasta")}
            type="button"
          >
            <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
              {etiquetaHasta}
            </span>
            <span
              className={`text-sm font-medium ${conRegreso ? "text-[#0B2545]" : "text-[#9AA7B8]"}`}
            >
              {conRegreso
                ? hasta
                  ? textoLargo(hasta)
                  : "Elegir fecha"
                : "Sólo ida"}
            </span>
          </button>
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
                  ? "Elige la fecha de salida"
                  : "Elige la fecha de regreso"
                : "Elige la fecha de salida"}
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
                ? "Elige la fecha de salida"
                : conRegreso && hasta
                  ? `${textoLargo(desde)} → ${textoLargo(hasta)} · ${noches} noche${noches === 1 ? "" : "s"}`
                  : conRegreso
                    ? `${textoLargo(desde)} → elige el regreso`
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
                Limpiar
              </button>
              <button
                className="rounded-lg bg-[#0B2545] px-4 py-1.5 text-xs font-semibold text-white"
                onClick={() => setAbierto(false)}
                type="button"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
