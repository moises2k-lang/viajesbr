/** Franjas de horario en lenguaje de viajero, en vez de deslizadores de horas. */
export const FRANJAS = [
  { texto: "Madrugada", detalle: "00:00 – 06:00", icono: "🌙", desde: 0, hasta: 6 },
  { texto: "Mañana", detalle: "06:00 – 12:00", icono: "🌅", desde: 6, hasta: 12 },
  { texto: "Tarde", detalle: "12:00 – 18:00", icono: "☀️", desde: 12, hasta: 18 },
  { texto: "Noche", detalle: "18:00 – 24:00", icono: "🌃", desde: 18, hasta: 24 },
];

export function franjaDe(iso: string): number {
  const hora = new Date(iso).getHours();
  return FRANJAS.findIndex(
    (franja) => hora >= franja.desde && hora < franja.hasta,
  );
}

/** Sin franjas marcadas no se filtra nada: marcar una es acotar, no esconder. */
export function dentroDeFranjas(iso: string, franjas: number[]): boolean {
  return franjas.length === 0 || franjas.includes(franjaDe(iso));
}
