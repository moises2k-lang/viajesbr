"use client";

import { useState } from "react";

export interface ParametrosFormulario {
  origen: string;
  destino: string;
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
  fechaSalida: "",
  fechaRegreso: null,
  adultos: 1,
  menores: [],
  bebes: 0,
  cabina: "economy",
};

interface Props {
  cargando: boolean;
  valoresIniciales: ParametrosFormulario | null;
  onBuscar: (parametros: ParametrosFormulario) => void;
}

export default function Buscador({ cargando, valoresIniciales, onBuscar }: Props) {
  const [datos, setDatos] = useState<ParametrosFormulario>(valoresIniciales ?? VACIO);
  const [edadesTexto, setEdadesTexto] = useState(datos.menores.join(", "));

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const menores = edadesTexto
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0)
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v >= 0 && v <= 17);
    onBuscar({
      ...datos,
      origen: datos.origen.trim().toUpperCase(),
      destino: datos.destino.trim().toUpperCase(),
      menores,
      fechaRegreso: datos.fechaRegreso || null,
    });
  }

  return (
    <form className="grid gap-4 rounded-lg border border-neutral-200 p-4 sm:grid-cols-4" onSubmit={enviar}>
      <label className="flex flex-col gap-1 text-sm">
        Origen (IATA)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={3}
          onChange={(e) => setDatos({ ...datos, origen: e.target.value })}
          placeholder="MEX"
          required
          value={datos.origen}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Destino (IATA)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={3}
          onChange={(e) => setDatos({ ...datos, destino: e.target.value })}
          placeholder="EZE"
          required
          value={datos.destino}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Salida
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setDatos({ ...datos, fechaSalida: e.target.value })}
          required
          type="date"
          value={datos.fechaSalida}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Regreso (opcional)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setDatos({ ...datos, fechaRegreso: e.target.value })}
          type="date"
          value={datos.fechaRegreso ?? ""}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Adultos
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          max={9}
          min={1}
          onChange={(e) => setDatos({ ...datos, adultos: Number(e.target.value) })}
          type="number"
          value={datos.adultos}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Edades de menores
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setEdadesTexto(e.target.value)}
          placeholder="8, 11, 14"
          value={edadesTexto}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Bebés en brazos
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          max={4}
          min={0}
          onChange={(e) => setDatos({ ...datos, bebes: Number(e.target.value) })}
          type="number"
          value={datos.bebes}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Cabina
        <select
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) =>
            setDatos({ ...datos, cabina: e.target.value as ParametrosFormulario["cabina"] })
          }
          value={datos.cabina ?? ""}
        >
          <option value="economy">Económica</option>
          <option value="premium_economy">Premium</option>
          <option value="business">Business</option>
          <option value="first">Primera</option>
        </select>
      </label>

      <div className="sm:col-span-4">
        <button
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-50"
          disabled={cargando}
          type="submit"
        >
          {cargando ? "Buscando…" : "Buscar vuelos"}
        </button>
      </div>
    </form>
  );
}
