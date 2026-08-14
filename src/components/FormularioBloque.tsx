"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TIPOS = ["vuelo", "hotel", "traslado", "actividad", "servicio", "nota"];

export default function FormularioBloque({ itinerarioId }: { itinerarioId: string }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("hotel");
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [detalle, setDetalle] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [costoNeto, setCostoNeto] = useState("");
  const [precioVenta, setPrecioVenta] = useState("");
  const [cotizacionId, setCotizacionId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch(`/api/itinerarios/${itinerarioId}/bloques`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          titulo,
          fecha: fecha || null,
          fechaFin: fechaFin || null,
          detalle,
          proveedor,
          costoNeto: costoNeto ? Number(costoNeto) : null,
          precioVenta: precioVenta ? Number(precioVenta) : null,
          cotizacionId: cotizacionId || null,
        }),
      });
      const cuerpo = (await respuesta.json()) as { error?: string };
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo agregar el bloque");
        return;
      }
      setTitulo("");
      setDetalle("");
      setCostoNeto("");
      setPrecioVenta("");
      setCotizacionId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="mt-8 space-y-3 border-t border-neutral-200 pt-6" onSubmit={crear}>
      <h2 className="text-lg font-semibold">Agregar bloque</h2>
      <p className="text-sm text-neutral-600">
        Si escribes el número de una cotización guardada, el vuelo se copia tal cual (aerolínea,
        tramos, horarios y precios) y se ignoran los campos manuales vacíos.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          Tipo
          <select
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setTipo(e.target.value)}
            value={tipo}
          >
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Cotización guardada (opcional)
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setCotizacionId(e.target.value.replace(/\D/g, ""))}
            placeholder="61"
            value={cotizacionId}
          />
        </label>
        <label className="text-sm">
          Proveedor
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Aeroméxico / Hotel Madero"
            value={proveedor}
          />
        </label>
        <label className="text-sm sm:col-span-3">
          Título
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Hotel 4 estrellas en Recoleta, habitación doble"
            value={titulo}
          />
        </label>
        <label className="text-sm sm:col-span-3">
          Detalle
          <textarea
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            value={detalle}
          />
        </label>
        <label className="text-sm">
          Fecha
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setFecha(e.target.value)}
            type="date"
            value={fecha}
          />
        </label>
        <label className="text-sm">
          Fecha fin (hospedaje)
          <input
            className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
            onChange={(e) => setFechaFin(e.target.value)}
            type="date"
            value={fechaFin}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Costo neto
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
              onChange={(e) => setCostoNeto(e.target.value)}
              step="0.01"
              type="number"
              value={costoNeto}
            />
          </label>
          <label className="text-sm">
            Precio de venta
            <input
              className="mt-1 w-full rounded border border-neutral-300 px-2 py-1"
              onChange={(e) => setPrecioVenta(e.target.value)}
              step="0.01"
              type="number"
              value={precioVenta}
            />
          </label>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={guardando}
        type="submit"
      >
        {guardando ? "Agregando…" : "Agregar bloque"}
      </button>
    </form>
  );
}
