"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface NuevaRegla {
  nombre: string;
  prioridad: string;
  aerolineaIata: string;
  origen: string;
  destino: string;
  moneda: string;
  porcentaje: string;
  montoFijo: string;
  montoMinimo: string;
}

const NUEVA: NuevaRegla = {
  nombre: "",
  prioridad: "100",
  aerolineaIata: "",
  origen: "",
  destino: "",
  moneda: "",
  porcentaje: "8",
  montoFijo: "0",
  montoMinimo: "0",
};

export default function FormularioRegla() {
  const router = useRouter();
  const [nueva, setNueva] = useState<NuevaRegla>(NUEVA);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/markup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nueva.nombre.trim(),
          prioridad: Number(nueva.prioridad),
          aerolineaIata: nueva.aerolineaIata.trim().toUpperCase() || null,
          origen: nueva.origen.trim().toUpperCase() || null,
          destino: nueva.destino.trim().toUpperCase() || null,
          moneda: nueva.moneda.trim().toUpperCase() || null,
          porcentaje: Number(nueva.porcentaje),
          montoFijo: Number(nueva.montoFijo),
          montoMinimo: Number(nueva.montoMinimo),
        }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo crear la regla");
        return;
      }
      setNueva(NUEVA);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="mt-8 grid gap-3 rounded-lg border border-neutral-200 p-4 sm:grid-cols-3" onSubmit={crear}>
      <h2 className="text-sm font-medium sm:col-span-3">Nueva regla</h2>

      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
          required
          value={nueva.nombre}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Prioridad (menor gana)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setNueva({ ...nueva, prioridad: e.target.value })}
          type="number"
          value={nueva.prioridad}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Aerolínea IATA (opcional)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={2}
          onChange={(e) => setNueva({ ...nueva, aerolineaIata: e.target.value })}
          placeholder="AV"
          value={nueva.aerolineaIata}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Origen (opcional)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={3}
          onChange={(e) => setNueva({ ...nueva, origen: e.target.value })}
          placeholder="MEX"
          value={nueva.origen}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Destino (opcional)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={3}
          onChange={(e) => setNueva({ ...nueva, destino: e.target.value })}
          placeholder="EZE"
          value={nueva.destino}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Moneda (opcional)
        <input
          className="rounded-md border border-neutral-300 px-3 py-2 uppercase"
          maxLength={3}
          onChange={(e) => setNueva({ ...nueva, moneda: e.target.value })}
          placeholder="USD"
          value={nueva.moneda}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Porcentaje sobre el neto
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setNueva({ ...nueva, porcentaje: e.target.value })}
          step="0.001"
          type="number"
          value={nueva.porcentaje}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Monto fijo
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setNueva({ ...nueva, montoFijo: e.target.value })}
          step="0.01"
          type="number"
          value={nueva.montoFijo}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Markup mínimo
        <input
          className="rounded-md border border-neutral-300 px-3 py-2"
          onChange={(e) => setNueva({ ...nueva, montoMinimo: e.target.value })}
          step="0.01"
          type="number"
          value={nueva.montoMinimo}
        />
      </label>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 sm:col-span-3">
          {error}
        </p>
      )}

      <div className="sm:col-span-3">
        <button
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm text-white disabled:opacity-50"
          disabled={guardando}
          type="submit"
        >
          {guardando ? "Guardando…" : "Agregar regla"}
        </button>
      </div>
    </form>
  );
}
