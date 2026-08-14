"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BotonBorrarBloque({
  itinerarioId,
  bloqueId,
}: {
  itinerarioId: string;
  bloqueId: string;
}) {
  const router = useRouter();
  const [borrando, setBorrando] = useState(false);

  async function borrar() {
    setBorrando(true);
    await fetch(`/api/itinerarios/${itinerarioId}/bloques?bloque=${bloqueId}`, {
      method: "DELETE",
    });
    setBorrando(false);
    router.refresh();
  }

  return (
    <button className="text-sm underline" disabled={borrando} onClick={borrar} type="button">
      {borrando ? "…" : "Quitar"}
    </button>
  );
}
