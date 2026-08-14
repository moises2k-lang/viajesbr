import type { HabitacionCatalogo } from "@/app/api/hoteles/[hotelId]/route";

/** Palabras que aparecen en casi toda habitación y no ayudan a distinguirla. */
const RELLENO = new Set([
  "room",
  "rooms",
  "habitacion",
  "habitación",
  "bed",
  "beds",
  "with",
  "and",
]);

function fichas(nombre: string): Set<string> {
  return new Set(
    nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((palabra) => palabra.length > 1 && !RELLENO.has(palabra)),
  );
}

/**
 * El motor de tarifas nombra las habitaciones distinto que el catálogo del hotel
 * ("STANDARD DOUBLE" contra "Standard Room, 2 Double Beds"), así que se empareja
 * por palabras compartidas y no por igualdad exacta.
 */
export function emparejarHabitacion(
  nombreTarifa: string,
  catalogo: HabitacionCatalogo[] | undefined,
): HabitacionCatalogo | null {
  if (!catalogo || catalogo.length === 0) return null;

  const buscadas = fichas(nombreTarifa);
  if (buscadas.size === 0) return null;

  let mejor: HabitacionCatalogo | null = null;
  let mejorPuntaje = 0;

  for (const habitacion of catalogo) {
    const propias = fichas(habitacion.nombre);
    if (propias.size === 0) continue;
    let comunes = 0;
    for (const palabra of buscadas) if (propias.has(palabra)) comunes += 1;
    if (comunes === 0) continue;
    const puntaje = comunes / Math.min(buscadas.size, propias.size);
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = habitacion;
    }
  }

  return mejorPuntaje >= 0.5 ? mejor : null;
}
