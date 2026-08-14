"use client";

import { useState } from "react";
import RangoFechas from "@/components/RangoFechas";

export interface ParametrosHotel {
  ciudad: string;
  pais: string;
  entrada: string;
  salida: string | null;
  adultos: number;
  menores: number[];
  moneda: string;
  nacionalidad: string;
}

const EDADES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const VACIO: ParametrosHotel = {
  ciudad: "",
  pais: "",
  entrada: "",
  salida: null,
  adultos: 2,
  menores: [],
  moneda: "USD",
  nacionalidad: "MX",
};

interface Props {
  cargando: boolean;
  valoresIniciales: ParametrosHotel | null;
  onBuscar: (parametros: ParametrosHotel) => void;
}

export default function BuscadorHoteles({ cargando, valoresIniciales, onBuscar }: Props) {
  const [datos, setDatos] = useState<ParametrosHotel>(valoresIniciales ?? VACIO);

  const completo =
    datos.ciudad.trim().length >= 2 &&
    datos.pais.trim().length === 2 &&
    datos.entrada !== "" &&
    datos.salida !== null;

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!completo) return;
    onBuscar({
      ...datos,
      ciudad: datos.ciudad.trim(),
      pais: datos.pais.trim().toUpperCase(),
    });
  }

  return (
    <form className="rounded-2xl bg-white p-4 shadow-lg shadow-[#0B2545]/10 sm:p-6" onSubmit={enviar}>
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Ciudad
          </label>
          <input
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
            onChange={(evento) => setDatos({ ...datos, ciudad: evento.target.value })}
            placeholder="Buenos Aires"
            required
            value={datos.ciudad}
          />
        </div>

        <div className="lg:col-span-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            País (2 letras)
          </label>
          <input
            autoComplete="off"
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium uppercase text-[#0B2545] outline-none focus:border-[#14477E] focus:ring-2 focus:ring-[#14477E]/20"
            maxLength={2}
            onChange={(evento) => setDatos({ ...datos, pais: evento.target.value })}
            placeholder="AR"
            required
            value={datos.pais}
          />
        </div>

        <div className="lg:col-span-6">
          <RangoFechas
            conRegreso
            desde={datos.entrada}
            etiquetaDesde="Entrada"
            etiquetaHasta="Salida"
            hasta={datos.salida}
            onCambio={(entrada, salida) => setDatos({ ...datos, entrada, salida })}
          />
        </div>

        <div className="lg:col-span-3">
          <label className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Adultos
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B2545]"
            onChange={(evento) => setDatos({ ...datos, adultos: Number(evento.target.value) })}
            value={datos.adultos}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-6">
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Menores y sus edades
          </span>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {datos.menores.map((edad, indice) => (
              <span className="flex items-center gap-1" key={`menor-${indice}`}>
                <select
                  className="rounded border border-[#E4E8EE] px-2 py-1 text-sm text-[#0B2545]"
                  onChange={(evento) => {
                    const menores = [...datos.menores];
                    menores[indice] = Number(evento.target.value);
                    setDatos({ ...datos, menores });
                  }}
                  value={edad}
                >
                  {EDADES.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion} años
                    </option>
                  ))}
                </select>
                <button
                  className="text-xs text-[#14477E] underline"
                  onClick={() =>
                    setDatos({
                      ...datos,
                      menores: datos.menores.filter((_, i) => i !== indice),
                    })
                  }
                  type="button"
                >
                  quitar
                </button>
              </span>
            ))}
            <button
              className="rounded-full border border-[#14477E] px-3 py-1 text-xs font-medium text-[#14477E]"
              onClick={() => setDatos({ ...datos, menores: [...datos.menores, 6] })}
              type="button"
            >
              Agregar menor
            </button>
          </div>
        </div>

        <div className="lg:col-span-3 lg:self-end">
          <button
            className="w-full rounded-lg bg-[#F0A400] px-4 py-3 text-sm font-semibold text-[#0B2545] disabled:opacity-50"
            disabled={cargando || !completo}
            type="submit"
          >
            {cargando ? "Buscando hoteles…" : "Buscar hoteles"}
          </button>
        </div>
      </div>
    </form>
  );
}
