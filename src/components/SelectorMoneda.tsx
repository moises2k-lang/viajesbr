"use client";

import { useMemo } from "react";
import SelectorConBandera from "@/components/SelectorConBandera";
import { MONEDAS } from "@/lib/monedas";

interface Props {
  valor: string | null;
  onCambio: (valor: string | null) => void;
  etiqueta?: string;
  placeholder?: string;
  permitirVacio?: boolean;
  vacioEtiqueta?: string;
  className?: string;
}

export default function SelectorMoneda({
  valor,
  onCambio,
  etiqueta = "Moneda",
  placeholder = "Seleccionar moneda",
  permitirVacio = false,
  vacioEtiqueta = "Cualquier moneda",
  className,
}: Props) {
  const items = useMemo(() => {
    const monedas = MONEDAS.map((m) => ({
      valor: m.codigo,
      iso: m.paisIso,
      etiqueta: `${m.codigo} – ${m.nombre}`,
    })).sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
    if (permitirVacio) {
      return [
        { valor: "", iso: "", etiqueta: vacioEtiqueta },
        ...monedas,
      ];
    }
    return monedas;
  }, [permitirVacio, vacioEtiqueta]);

  return (
    <SelectorConBandera
      buscable
      className={className}
      etiqueta={etiqueta}
      items={items}
      placeholder={placeholder}
      placeholderBusqueda="Buscar moneda…"
      valor={valor ?? ""}
      onCambio={(nuevo) => onCambio(nuevo === "" ? null : nuevo)}
    />
  );
}
