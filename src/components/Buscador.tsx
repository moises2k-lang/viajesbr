"use client";

import { useState } from "react";
import CampoAeropuerto from "@/components/CampoAeropuerto";
import SelectorPasajeros, { type Pasajeros } from "@/components/SelectorPasajeros";

export interface ParametrosFormulario {
  origen: string;
  destino: string;
  origenNombre?: string | null;
  destinoNombre?: string | null;
  fechaSalida: string;
  fechaRegreso: string | null;
  adultos: number;
  menores: number[];
  bebes: number;
  cabina: "economy" | "premium_economy" | "business" | "first" | null;
}

const VACIO: ParametrosFormulario = {
  origen: "MEX",
  destino: "",
  origenNombre: "Ciudad de México",
  destinoNombre: null,
  fechaSalida: "",
  fechaRegreso: null,
  adultos: 1,
  menores: [],
  bebes: 0,
  cabina: "economy",
};

const CABINAS: { valor: NonNullable<ParametrosFormulario["cabina"]>; texto: string }[] = [
  { valor: "economy", texto: "Turista" },
  { valor: "premium_economy", texto: "Premium" },
  { valor: "business", texto: "Business" },
  { valor: "first", texto: "Primera" },
];

interface Props {
  cargando: boolean;
  valoresIniciales: ParametrosFormulario | null;
  onBuscar: (parametros: ParametrosFormulario) => void;
}

export default function Buscador({ cargando, valoresIniciales, onBuscar }: Props) {
  const [datos, setDatos] = useState<ParametrosFormulario>(valoresIniciales ?? VACIO);
  const [inversiones, setInversiones] = useState(0);
  const [redondo, setRedondo] = useState(
    valoresIniciales ? valoresIniciales.fechaRegreso !== null : true,
  );

  const pasajeros: Pasajeros = {
    adultos: datos.adultos,
    menores: datos.menores,
    bebes: datos.bebes,
  };

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    onBuscar({
      ...datos,
      origen: datos.origen.trim().toUpperCase(),
      destino: datos.destino.trim().toUpperCase(),
      fechaRegreso: redondo ? datos.fechaRegreso || null : null,
    });
  }

  function invertir() {
    setInversiones((n) => n + 1);
    setDatos({
      ...datos,
      origen: datos.destino,
      destino: datos.origen,
      origenNombre: datos.destinoNombre ?? null,
      destinoNombre: datos.origenNombre ?? null,
    });
  }

  return (
    <form className="rounded-2xl bg-white p-4 shadow-lg shadow-[#0B2545]/10 sm:p-6" onSubmit={enviar}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
          <button
            className={`rounded-full px-4 py-1.5 font-medium ${redondo ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"}`}
            onClick={() => setRedondo(true)}
            type="button"
          >
            Redondo
          </button>
          <button
            className={`rounded-full px-4 py-1.5 font-medium ${redondo ? "text-[#5A6B80]" : "bg-white text-[#0B2545] shadow"}`}
            onClick={() => setRedondo(false)}
            type="button"
          >
            Sólo ida
          </button>
        </div>
        <div className="flex rounded-full bg-[#E4E8EE] p-1 text-sm">
          {CABINAS.map((cabina) => (
            <button
              className={`rounded-full px-3 py-1.5 font-medium ${
                datos.cabina === cabina.valor ? "bg-white text-[#0B2545] shadow" : "text-[#5A6B80]"
              }`}
              key={cabina.valor}
              onClick={() => setDatos({ ...datos, cabina: cabina.valor })}
              type="button"
            >
              {cabina.texto}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="relative lg:col-span-3">
          <CampoAeropuerto
            descripcion={datos.origenNombre ?? null}
            etiqueta="Origen"
            key={`origen-${inversiones}`}
            onCambio={(codigo, nombre) => setDatos({ ...datos, origen: codigo, origenNombre: nombre })}
            valor={datos.origen}
          />
          <button
            aria-label="Invertir origen y destino"
            className="absolute -right-3 top-8 z-10 hidden h-7 w-7 items-center justify-center rounded-full border border-[#E4E8EE] bg-white text-xs text-[#14477E] shadow lg:flex"
            onClick={invertir}
            type="button"
          >
            ⇄
          </button>
        </div>

        <div className="lg:col-span-3">
          <CampoAeropuerto
            descripcion={datos.destinoNombre ?? null}
            etiqueta="Destino"
            key={`destino-${inversiones}`}
            onCambio={(codigo, nombre) =>
              setDatos({ ...datos, destino: codigo, destinoNombre: nombre })
            }
            valor={datos.destino}
          />
        </div>

        <label className="lg:col-span-2">
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Salida
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E]"
            onChange={(evento) => setDatos({ ...datos, fechaSalida: evento.target.value })}
            required
            type="date"
            value={datos.fechaSalida}
          />
        </label>

        <label className="lg:col-span-2">
          <span className="block text-xs font-medium uppercase tracking-wide text-[#5A6B80]">
            Regreso
          </span>
          <input
            className="mt-1 w-full rounded-lg border border-[#E4E8EE] bg-white px-3 py-2.5 text-sm font-medium text-[#0B2545] outline-none focus:border-[#14477E] disabled:bg-[#F5F7FA] disabled:text-[#9AA7B8]"
            disabled={!redondo}
            min={datos.fechaSalida || undefined}
            onChange={(evento) => setDatos({ ...datos, fechaRegreso: evento.target.value })}
            required={redondo}
            type="date"
            value={datos.fechaRegreso ?? ""}
          />
        </label>

        <div className="lg:col-span-2">
          <SelectorPasajeros
            onCambio={(p) => setDatos({ ...datos, ...p })}
            valor={pasajeros}
          />
        </div>
      </div>

      <button
        className="mt-4 w-full rounded-lg bg-[#0B2545] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#14477E] disabled:opacity-60 sm:w-auto"
        disabled={cargando}
        type="submit"
      >
        {cargando ? "Buscando tarifas…" : "Buscar vuelos"}
      </button>
    </form>
  );
}
