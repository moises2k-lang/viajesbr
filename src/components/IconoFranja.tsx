"use client";

import { franjaDe, FRANJAS } from "@/lib/franjas";

const ICONOS = ["🌅", "☀️", "🌇", "🌙"];

export default function IconoFranja({
  iso,
  className = "",
}: {
  iso: string;
  className?: string;
}) {
  const i = franjaDe(iso);
  if (i < 0 || i >= ICONOS.length) return null;
  return (
    <span
      className={`inline-block text-xs ${className}`}
      title={`${FRANJAS[i].texto} (${FRANJAS[i].detalle})`}
    >
      {ICONOS[i]}
    </span>
  );
}
