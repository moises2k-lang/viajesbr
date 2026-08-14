"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function FormularioItinerario() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [cliente, setCliente] = useState("");
  const [resumen, setResumen] = useState("");
  const [moneda, setMoneda] = useState("USD");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/itinerarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, cliente, resumen, moneda }),
      });
      const cuerpo = (await respuesta.json()) as { id?: string; error?: string };
      if (!respuesta.ok || !cuerpo.id) {
        setError(cuerpo.error ?? "No se pudo crear el itinerario");
        return;
      }
      router.push(`/admin/itinerarios/${cuerpo.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="mt-8 space-y-3 border-t border-neutral-200 pt-6" onSubmit={crear}>
      <h2 className="text-lg font-semibold">Nuevo itinerario</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Título
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Buenos Aires, diciembre 2026"
            required
            value={titulo}
          />
        </label>
        <label className="text-sm">
          Cliente
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setCliente(e.target.value)}
            placeholder="Moisés Mejlachowicz"
            required
            value={cliente}
          />
        </label>
        <label className="text-sm sm:col-span-2">
          Resumen para el cliente
          <textarea
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setResumen(e.target.value)}
            rows={3}
            value={resumen}
          />
        </label>
        <label className="text-sm">
          Moneda
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1 uppercase"
            maxLength={3}
            onChange={(e) => setMoneda(e.target.value.toUpperCase())}
            required
            value={moneda}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={guardando}
        type="submit"
      >
        {guardando ? "Creando…" : "Crear itinerario"}
      </button>
    </form>
  );
}
