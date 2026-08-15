"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

interface Props {
  value: string; // YYYY-MM-DD o ""
  onChange: (value: string) => void;
  etiqueta?: string;
  required?: boolean;
  className?: string;
  maxYear?: number;
  minYear?: number;
}

function diasMes(anio: number, mes: number): number {
  return new Date(anio, mes + 1, 0).getDate();
}

function parsear(value: string): { anio: string; mes: string; dia: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { anio: "", mes: "", dia: "" };
  }
  const [anio, mes, dia] = value.split("-");
  return { anio, mes, dia };
}

export default function FechaNacimiento({
  value,
  onChange,
  etiqueta,
  required,
  className,
  maxYear,
  minYear,
}: Props) {
  const { t, locale } = useI18n();
  const hoy = new Date();
  const anioMax = maxYear ?? hoy.getFullYear();
  const anioMin = minYear ?? 1920;
  const [partes, setPartes] = useState(parsear(value));

  useEffect(() => {
    setPartes(parsear(value));
  }, [value]);

  const meses = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const fecha = new Date(2020, i, 1);
      const nombre = new Intl.DateTimeFormat(locale, { month: "long" }).format(
        fecha,
      );
      return { valor: String(i + 1).padStart(2, "0"), nombre };
    });
  }, [locale]);

  const anioActual = partes.anio ? Number(partes.anio) : anioMax;
  const mesActual = partes.mes ? Number(partes.mes) : 1;
  const maxDia =
    partes.anio && partes.mes
      ? diasMes(Number(partes.anio), Number(partes.mes) - 1)
      : 31;

  function actualizar(nuevo: Partial<typeof partes>) {
    const actual = { ...partes, ...nuevo };
    setPartes(actual);
    if (actual.anio && actual.mes && actual.dia) {
      const diaNum = Number(actual.dia);
      const mesNum = Number(actual.mes);
      const anioNum = Number(actual.anio);
      const max = diasMes(anioNum, mesNum - 1);
      const diaSeguro = Math.min(diaNum, max);
      onChange(
        `${actual.anio}-${actual.mes}-${String(diaSeguro).padStart(2, "0")}`,
      );
    } else {
      onChange("");
    }
  }

  const selectClase =
    "w-full min-w-0 rounded-md border border-[#14477E] bg-white px-2 py-2.5 text-sm font-semibold text-[#0B2545] focus:border-[#0B2545] focus:outline-none";

  return (
    <div className={className}>
      {etiqueta && (
        <label className="mb-1 block text-sm font-bold text-[#0B2545]">
          {etiqueta} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label={t("form.day")}
          className={selectClase}
          required={required}
          value={partes.dia}
          onChange={(e) => actualizar({ dia: e.target.value })}
        >
          <option value="">{t("form.day")}</option>
          {Array.from({ length: maxDia }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d).padStart(2, "0")}>
              {d}
            </option>
          ))}
        </select>
        <select
          aria-label={t("form.month")}
          className={selectClase}
          required={required}
          value={partes.mes}
          onChange={(e) => actualizar({ mes: e.target.value })}
        >
          <option value="">{t("form.month")}</option>
          {meses.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.nombre}
            </option>
          ))}
        </select>
        <select
          aria-label={t("form.year")}
          className={selectClase}
          required={required}
          value={partes.anio}
          onChange={(e) => actualizar({ anio: e.target.value })}
        >
          <option value="">{t("form.year")}</option>
          {Array.from({ length: anioMax - anioMin + 1 }, (_, i) => anioMax - i).map(
            (a) => (
              <option key={a} value={String(a)}>
                {a}
              </option>
            ),
          )}
        </select>
      </div>
    </div>
  );
}
