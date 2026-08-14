"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ESTADOS = ["borrador", "cotizacion", "confirmado", "cancelado"];

export default function SelectorEstado({
  itinerarioId,
  estado,
}: {
  itinerarioId: string;
  estado: string;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(estado);
  const [guardando, setGuardando] = useState(false);

  async function cambiar(nuevo: string) {
    setValor(nuevo);
    setGuardando(true);
    await fetch(`/api/itinerarios/${itinerarioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    setGuardando(false);
    router.refresh();
  }

  return (
    <label className="text-sm">
      Estado{" "}
      <select
        className="rounded border border-neutral-300 px-2 py-1"
        disabled={guardando}
        onChange={(e) => cambiar(e.target.value)}
        value={valor}
      >
        {ESTADOS.map((e) => (
          <option key={e} value={e}>
            {e}
          </option>
        ))}
      </select>
    </label>
  );
}
