"use client";

import { dinero, dineroCorto } from "@/lib/dinero";
import { useMoneda } from "@/components/MonedaContext";

interface Props {
  monto: number | null | undefined;
  moneda?: string | null;
  className?: string;
  corto?: boolean;
}

export default function Precio({ monto, moneda, className, corto }: Props) {
  const { moneda: monedaPreferida, convertir } = useMoneda();

  if (monto == null || Number.isNaN(monto)) return null;

  const monedaDestino = monedaPreferida.toUpperCase();
  const monedaOrigen = (moneda ?? monedaPreferida).toUpperCase();
  const convertido =
    monedaDestino !== monedaOrigen ? convertir(monto, monedaOrigen) : monto;

  const montoMostrar = convertido ?? monto;
  const monedaMostrar = convertido != null ? monedaDestino : monedaOrigen;
  const texto = corto
    ? dineroCorto(montoMostrar, monedaMostrar)
    : dinero(montoMostrar, monedaMostrar);

  return <span className={className}>{texto}</span>;
}
