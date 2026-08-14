"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function BotonDesactivar({ id }: { id: string }) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);

  async function desactivar() {
    setEnviando(true);
    try {
      await fetch(`/api/markup?id=${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <button className="underline disabled:opacity-50" disabled={enviando} onClick={desactivar} type="button">
      {enviando ? "…" : "Desactivar"}
    </button>
  );
}
