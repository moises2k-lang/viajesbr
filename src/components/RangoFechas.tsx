"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  desde: string;
  hasta: string | null;
  conRegreso: boolean;
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

export default function RangoFechas({ desde, hasta, conRegreso, onCambio }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [eligiendo, setEligiendo] = useState<"desde" | "hasta">("desde");
  const inicial = desde || hoyIso();
  const [mesBase, setMesBase] = useState(() => {
    const [anio, mes] = inicial.split("-").map(Number);
    return { anio, mes: mes - 1 };
  });
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function fuera(evento: MouseEvent) {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) {
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

  function elegir(iso: string) {
    if (!conRegreso) {
      onCambio(iso, null);
      setAbierto(false);
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
    setAbierto(false);
  }

  function mover(saltos: number) {
    const fecha = new Date(mesBase.anio, mesBase.mes + saltos, 1);
    setMesBase({ anio: fecha.getFullYear(), mes: fecha.getMonth() });
  }

  const minimo = hoyIso();

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
        <div className="mt-1 grid grid-cols-7 gap-1">
          {casillas(anio, numeroMes).map((dia, indice) => {
            if (dia === null) return <span key={`hueco-${indice}`} />;
            const iso = aIso(anio, numeroMes, dia);
            const pasada = iso < minimo;
            const esDesde = iso === desde;
            const esHasta = hasta !== null && iso === hasta;
            const enRango = hasta !== null && desde !== "" && iso > desde && iso < hasta;
            return (
              <button
                className={`h-8 rounded text-sm ${
                  esDesde || esHasta
                    ? "bg-[#0B2545] font-semibold text-white"
                    : enRango
                      ? "bg-[#E4E8EE] text-[#0B2545]"
                      : "text-[#0B2545] hover:bg-[#F5F7FA]"
                } disabled:cursor-not-allowed disabled:text-[#D7DDE5] disabled:hover:bg-transparent`}
                disabled={pasada}
                key={iso}
                onClick={() => elegir(iso)}
                type="button"
              >
                {dia}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={contenedor}>
      <div className="grid grid-cols-2 gap-2">
        <button
          className={`rounded-lg border bg-white px-3 py-2.5 text-left ${
            abierto && eligiendo === "desde" ? "border-[#14477E]" : "border-[#E4E8EE]"
          }`}
          onClick={() => abrir("desde")}
          type="button"
        >
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Desde
          </span>
          <span className="text-sm font-medium text-[#0B2545]">
            {desde ? textoLargo(desde) : "Elegir fecha"}
          </span>
        </button>
        <button
          className={`rounded-lg border bg-white px-3 py-2.5 text-left disabled:bg-[#F5F7FA] ${
            abierto && eligiendo === "hasta" ? "border-[#14477E]" : "border-[#E4E8EE]"
          }`}
          disabled={!conRegreso}
          onClick={() => abrir("hasta")}
          type="button"
        >
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Hasta
          </span>
          <span
            className={`text-sm font-medium ${conRegreso ? "text-[#0B2545]" : "text-[#9AA7B8]"}`}
          >
            {conRegreso ? (hasta ? textoLargo(hasta) : "Elegir fecha") : "Sólo ida"}
          </span>
        </button>
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
          <div className="flex flex-col gap-6 sm:flex-row">
            {mes(0)}
            {mes(1)}
          </div>
        </div>
      )}
    </div>
  );
}
