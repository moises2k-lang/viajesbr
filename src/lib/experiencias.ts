import { query } from "@/lib/db";
import {
  type DatosPaquete,
  type DiaItinerario,
  type PaqueteTematico,
  normalizarDatos,
} from "@/lib/experiencias-helpers";

export type { DatosPaquete, DiaItinerario, PaqueteTematico };
export {
  actividadesDetalle,
  fechaSugerida,
  fechasRecomendadas,
  galeriaDePaquete,
  incluyePaquete,
  itinerarioDePaquete,
  noIncluyePaquete,
} from "@/lib/experiencias-helpers";

function normalizarFila(fila: Record<string, unknown>): PaqueteTematico {
  return {
    id: Number(fila.id),
    slug: String(fila.slug),
    categoria: String(fila.categoria),
    titulo: String(fila.titulo),
    subtitulo: fila.subtitulo ? String(fila.subtitulo) : null,
    descripcion: fila.descripcion ? String(fila.descripcion) : null,
    imagen: fila.imagen ? String(fila.imagen) : null,
    origenIata: fila.origen_iata ? String(fila.origen_iata) : null,
    destinoIata: String(fila.destino_iata),
    destinoCiudad: String(fila.destino_ciudad),
    destinoPaisCode: fila.destino_pais_code ? String(fila.destino_pais_code) : null,
    duracionNoches: fila.duracion_noches ? Number(fila.duracion_noches) : null,
    adultos: Number(fila.adultos),
    menores: Array.isArray(fila.menores) ? fila.menores.map((m) => Number(m)) : [],
    bebes: Number(fila.bebes),
    cabina: fila.cabina ? String(fila.cabina) : null,
    aerolineasPreferidas: Array.isArray(fila.aerolineas_preferidas)
      ? fila.aerolineas_preferidas.map((s) => String(s))
      : [],
    hotelEstrellasMin: fila.hotel_estrellas_min ? Number(fila.hotel_estrellas_min) : null,
    tags: Array.isArray(fila.tags) ? fila.tags.map((s) => String(s)) : [],
    datos: normalizarDatos(fila.datos),
  };
}

export async function listarPaquetes(categoria?: string): Promise<PaqueteTematico[]> {
  const where: string[] = ["activo = true"];
  const params: unknown[] = [];
  if (categoria) {
    params.push(categoria);
    where.push(`categoria = $${params.length}`);
  }
  const filas = await query<Record<string, unknown>>(
    `SELECT * FROM paquetes_tematicos WHERE ${where.join(" AND ")} ORDER BY titulo`,
    params,
  );
  return filas.map(normalizarFila);
}

export async function paquetePorSlug(slug: string): Promise<PaqueteTematico | null> {
  const filas = await query<Record<string, unknown>>(
    "SELECT * FROM paquetes_tematicos WHERE slug = $1 AND activo = true",
    [slug],
  );
  return filas[0] ? normalizarFila(filas[0]) : null;
}

export function categoriasPaquete(): { id: string; nombre: string }[] {
  return [
    { id: "negocios", nombre: "Negocios" },
    { id: "ocio", nombre: "Ocio" },
    { id: "familia", nombre: "Familiar" },
    { id: "romantico", nombre: "Romántico" },
    { id: "aventura", nombre: "Aventura" },
    { id: "gastronomia", nombre: "Gastronomía" },
    { id: "playa", nombre: "Playa" },
    { id: "naturaleza", nombre: "Naturaleza" },
    { id: "luna_de_miel", nombre: "Luna de miel" },
    { id: "cultural", nombre: "Cultural" },
    { id: "lujo", nombre: "Lujo" },
  ];
}
