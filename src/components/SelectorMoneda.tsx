"use client";

import { useMemo } from "react";
import BanderaIso from "@/components/BanderaIso";
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

  const porCodigo = useMemo(
    () => new Map(MONEDAS.map((m) => [m.codigo, m])),
    [],
  );

  return (
    <SelectorConBandera
      buscable
      className={className}
      etiqueta={etiqueta}
      items={items}
      placeholder={placeholder}
      placeholderBusqueda="Buscar moneda…"
      renderEtiqueta={(item) => {
        const m = porCodigo.get(item.valor);
        return (
          <span className="flex items-center gap-2">
            {m && <BanderaIso iso={m.paisIso} />}
            <span>{item.valor}</span>
          </span>
        );
      }}
      renderOpcion={(item) => {
        const m = porCodigo.get(item.valor);
        return (
          <span className="flex items-center gap-2">
            {m && <BanderaIso iso={m.paisIso} />}
            <span>{item.etiqueta}</span>
          </span>
        );
      }}
      valor={valor ?? ""}
      onCambio={(nuevo) => onCambio(nuevo === "" ? null : nuevo)}
    />
  );
}
