import airports from "@/data/airports.json";
import { bandera, nombrePais } from "@/lib/paises";

export interface OpcionCiudad {
  placeId: string;
  nombre: string;
  detalle: string;
  pais: string | null;
  bandera: string | null;
}

const NORMALIZAR_RE = /[\s\-'.]/g;

function slugCiudad(nombre: string): string {
  return nombre.toLowerCase().replace(NORMALIZAR_RE, "");
}

function cityId(nombre: string, iso: string): string {
  return `static|${iso.toLowerCase()}|${slugCiudad(nombre)}`;
}

const CIUDADES: OpcionCiudad[] = (() => {
  const visto = new Set<string>();
  const lista: OpcionCiudad[] = [];
  for (const a of airports as { iata?: string; city?: string; country?: string }[]) {
    const iso = a.country?.toUpperCase();
    const ciudad = a.city?.trim();
    if (!iso || !ciudad) continue;
    const id = cityId(ciudad, iso);
    if (visto.has(id)) continue;
    visto.add(id);
    const pais = nombrePais(iso) ?? iso;
    lista.push({
      placeId: id,
      nombre: ciudad,
      detalle: `${ciudad}, ${pais}`,
      pais: iso,
      bandera: bandera(iso),
    });
  }
  return lista;
})();

function coincideCiudad(opcion: OpcionCiudad, consulta: string): number {
  const q = slugCiudad(consulta);
  const nombre = slugCiudad(opcion.nombre);
  const detalle = slugCiudad(opcion.detalle);
  if (nombre === q) return 1000;
  if (nombre.startsWith(q)) return 800 - opcion.nombre.length;
  if (nombre.includes(q)) return 600 - opcion.nombre.length;
  if (detalle.includes(q)) return 300 - opcion.detalle.length;
  return -1;
}

export function sugerirCiudadesEstaticas(consulta: string): OpcionCiudad[] {
  const q = consulta.trim();
  if (!q || q.length < 2) return [];
  const resultados = CIUDADES.map((c) => ({ c, score: coincideCiudad(c, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.c.nombre.localeCompare(b.c.nombre))
    .map((r) => r.c)
    .slice(0, 12);
  return resultados;
}
