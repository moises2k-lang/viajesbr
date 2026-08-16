export interface DiaItinerario {
  dia: number;
  titulo: string;
  descripcion: string;
}

export interface DatosPaquete {
  tipo?: string;
  actividades?: string[];
  actividadesDetalle?: { titulo: string; descripcion: string; icono?: string }[];
  itinerario?: DiaItinerario[];
  incluye?: string[];
  noIncluye?: string[];
  fechasRecomendadas?: string;
  fechaSugerida?: string;
  galeria?: string[];
  consejos?: string;
}

export interface PaqueteTematico {
  id: number;
  slug: string;
  categoria: string;
  titulo: string;
  subtitulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  origenIata: string | null;
  destinoIata: string;
  destinoCiudad: string;
  destinoPaisCode: string | null;
  duracionNoches: number | null;
  adultos: number;
  menores: number[];
  bebes: number;
  cabina: string | null;
  aerolineasPreferidas: string[];
  hotelEstrellasMin: number | null;
  tags: string[];
  datos: DatosPaquete | null;
}

export function normalizarDatos(valor: unknown): DatosPaquete | null {
  if (typeof valor !== "object" || valor === null) return null;
  const raw = valor as Record<string, unknown>;
  const comoArrayString = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v.filter((x): x is string => typeof x === "string");
  };
  const comoItinerario = (v: unknown): DiaItinerario[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v
      .filter((x) => typeof x === "object" && x !== null)
      .map((x) => x as Record<string, unknown>)
      .map((x) => ({
        dia: Number(x.dia) || 0,
        titulo: String(x.titulo ?? ""),
        descripcion: String(x.descripcion ?? ""),
      }));
  };
  const comoActividadesDetalle = (v: unknown): { titulo: string; descripcion: string; icono?: string }[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    return v
      .filter((x) => typeof x === "object" && x !== null)
      .map((x) => x as Record<string, unknown>)
      .map((x) => ({
        titulo: String(x.titulo ?? ""),
        descripcion: String(x.descripcion ?? ""),
        icono: x.icono ? String(x.icono) : undefined,
      }));
  };
  return {
    tipo: raw.tipo ? String(raw.tipo) : undefined,
    actividades: comoArrayString(raw.actividades),
    actividadesDetalle: comoActividadesDetalle(raw.actividadesDetalle),
    itinerario: comoItinerario(raw.itinerario),
    incluye: comoArrayString(raw.incluye),
    noIncluye: comoArrayString(raw.noIncluye),
    fechasRecomendadas: raw.fechasRecomendadas ? String(raw.fechasRecomendadas) : undefined,
    fechaSugerida: raw.fechaSugerida ? String(raw.fechaSugerida) : undefined,
    galeria: comoArrayString(raw.galeria),
    consejos: raw.consejos ? String(raw.consejos) : undefined,
  };
}

export function itinerarioDePaquete(paquete: PaqueteTematico): DiaItinerario[] {
  return paquete.datos?.itinerario ?? [];
}

export function fechasRecomendadas(paquete: PaqueteTematico): string | null {
  return paquete.datos?.fechasRecomendadas ?? null;
}

export function fechaSugerida(paquete: PaqueteTematico): string | null {
  return paquete.datos?.fechaSugerida ?? null;
}

export function galeriaDePaquete(paquete: PaqueteTematico): string[] {
  return paquete.datos?.galeria ?? [];
}

export function actividadesDetalle(paquete: PaqueteTematico): { titulo: string; descripcion: string; icono?: string }[] {
  return paquete.datos?.actividadesDetalle ?? [];
}

export function incluyePaquete(paquete: PaqueteTematico): string[] {
  return paquete.datos?.incluye ?? [];
}

export function noIncluyePaquete(paquete: PaqueteTematico): string[] {
  return paquete.datos?.noIncluye ?? [];
}
