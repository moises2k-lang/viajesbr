"use client";

import { Moon, MoonStar, Sunrise, Sun } from "lucide-react";
import { franjaDe, FRANJAS } from "@/lib/franjas";

const ICONOS = [Moon, Sunrise, Sun, MoonStar];

export default function IconoFranja({
  iso,
  franja,
  className = "",
}: {
  iso?: string;
  franja?: number;
  className?: string;
}) {
  const i =
    typeof franja === "number"
      ? franja
      : iso
        ? franjaDe(iso)
        : -1;
  if (i < 0 || i >= FRANJAS.length) return null;
  const Icono = ICONOS[i];
  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={`${FRANJAS[i].texto} (${FRANJAS[i].detalle})`}
    >
      <Icono className="h-4 w-4" />
    </span>
  );
}
