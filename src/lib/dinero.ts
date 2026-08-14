/** Todas las cantidades se muestran con signo de pesos y su moneda. */
export function dinero(monto: number, moneda?: string | null): string {
  const cifra = monto.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return moneda ? `$${cifra} ${moneda}` : `$${cifra}`;
}

/** Misma cantidad sin centavos, para listas donde el centavo estorba. */
export function dineroCorto(monto: number, moneda?: string | null): string {
  const cifra = monto.toLocaleString("es-MX", { maximumFractionDigits: 0 });
  return moneda ? `$${cifra} ${moneda}` : `$${cifra}`;
}

/** Logo oficial de la aerolínea servido por Duffel, cuando la oferta no trae uno. */
export function logoAerolinea(iata: string): string {
  return `https://assets.duffel.com/img/airlines/for-light-background/full-color-logo/${iata.toUpperCase()}.svg`;
}
