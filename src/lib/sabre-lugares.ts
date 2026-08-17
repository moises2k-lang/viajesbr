import { sabreFetch } from "@/lib/sabre";
import type { AeropuertoSugerido, LugarSugerido } from "@/lib/duffel";
import rawAirports from "@/data/airports.json";

interface SabreGeoDoc {
  name?: string;
  city?: string;
  country?: string;
  countryName?: string;
  stateName?: string;
  state?: string;
  category?: string;
  id?: string;
  dataset?: string;
  datasource?: string;
  confidenceFactor?: string;
  latitude?: string;
  longitude?: string;
  iataCityCode?: string;
  ranking?: number;
}

interface SabreGeoAutocompleteResponse {
  responseHeader?: { status?: number; QTime?: number };
  grouped?: Record<
    string,
    {
      matches?: number;
      doclist?: {
        numFound?: number;
        start?: number;
        docs: SabreGeoDoc[];
      };
    }
  >;
}

interface AeropuertoEstatico {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number | null;
  lon: number | null;
}

const AEROPUERTOS_ESTATICOS = (rawAirports as unknown as AeropuertoEstatico[]).filter(
  (a) => typeof a.iata === "string" && a.iata.length === 3,
);

function parseCoord(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function aeropuertoEstaticoToSugerido(a: AeropuertoEstatico): LugarSugerido {
  return {
    id: `static-airport-${a.iata}`,
    name: a.name,
    iata_code: a.iata,
    iata_city_code: null,
    city_name: a.city || null,
    iata_country_code: a.country || null,
    latitude: a.lat,
    longitude: a.lon,
    type: "airport",
  };
}

function scoreCoincidencia(
  consulta: string,
  aeropuerto: AeropuertoEstatico,
): number {
  const q = normalizar(consulta);
  const iata = aeropuerto.iata.toLowerCase();
  const nombre = normalizar(aeropuerto.name);
  const ciudad = normalizar(aeropuerto.city);

  if (iata === q) return 100;
  if (nombre.startsWith(q)) return 80;
  if (ciudad.startsWith(q)) return 70;
  if (nombre.includes(` ${q}`)) return 60;
  if (nombre.includes(q)) return 50;
  if (ciudad.includes(q)) return 40;
  return 0;
}

function sugerirLugaresEstaticos(consulta: string): LugarSugerido[] {
  const texto = consulta.trim();
  if (texto.length < 2) return [];

  const resultados = AEROPUERTOS_ESTATICOS.map((a) => ({
    a,
    score: scoreCoincidencia(texto, a),
  }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.a.iata.localeCompare(b.a.iata))
    .slice(0, 12)
    .map((r) => aeropuertoEstaticoToSugerido(r.a));

  const vistos = new Set<string>();
  return resultados.filter((l) => {
    if (vistos.has(l.iata_code!)) return false;
    vistos.add(l.iata_code!);
    return true;
  });
}

function aeropuertosDelPaisEstaticos(codigoPais: string): AeropuertoSugerido[] {
  const pais = codigoPais.toUpperCase();
  return AEROPUERTOS_ESTATICOS.filter((a) => a.country?.toUpperCase() === pais).map(
    (a) => ({
      id: `static-airport-${a.iata}`,
      name: a.name,
      iata_code: a.iata,
      iata_city_code: null,
      city_name: a.city || null,
      iata_country_code: a.country || null,
      latitude: a.lat,
      longitude: a.lon,
    }),
  );
}

async function sugerirLugaresDesdeSabre(
  consulta: string,
): Promise<LugarSugerido[]> {
  const texto = consulta.trim();
  if (texto.length < 3) return [];

  try {
    const data = await sabreFetch<SabreGeoAutocompleteResponse>(
      `/v2/geo/autocomplete?query=${encodeURIComponent(texto)}&limit=12`,
      { method: "GET" },
    );
    // eslint-disable-next-line no-console
    console.error("[Sabre Geo] query:", texto, "raw:", JSON.stringify(data));

    const groups = data.grouped ?? {};
    const getGroup = (key: string) => groups[key]?.doclist?.docs ?? [];
    const cityDocs = getGroup("category:CITY");
    const airDocs = getGroup("category:AIR");

    const ciudades = new Map<string, LugarSugerido>();

    for (const doc of cityDocs) {
      const code = doc.id;
      if (!code || ciudades.has(code)) continue;
      ciudades.set(code, {
        id: `sabre-city-${code}`,
        name: doc.name ?? doc.city ?? code,
        iata_code: code,
        iata_city_code: code,
        city_name: doc.city ?? null,
        iata_country_code: doc.country ?? null,
        latitude: parseCoord(doc.latitude),
        longitude: parseCoord(doc.longitude),
        type: "city",
        airports: [],
      });
    }

    const lugares: LugarSugerido[] = [];
    for (const city of ciudades.values()) lugares.push(city);

    for (const doc of airDocs) {
      const code = doc.id;
      if (!code) continue;
      const airport: AeropuertoSugerido = {
        id: `sabre-airport-${code}`,
        name: doc.name ?? code,
        iata_code: code,
        iata_city_code: doc.iataCityCode ?? null,
        city_name: doc.city ?? null,
        iata_country_code: doc.country ?? null,
        latitude: parseCoord(doc.latitude),
        longitude: parseCoord(doc.longitude),
      };

      const cityCode = doc.iataCityCode;
      if (cityCode && ciudades.has(cityCode)) {
        const city = ciudades.get(cityCode)!;
        city.airports!.push(airport);
      } else {
        lugares.push({
          id: airport.id,
          name: airport.name,
          iata_code: code,
          iata_city_code: airport.iata_city_code,
          city_name: airport.city_name,
          iata_country_code: airport.iata_country_code,
          latitude: airport.latitude,
          longitude: airport.longitude,
          type: "airport",
        });
      }
    }

    return lugares;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Sabre Geo] error:", (error as Error).message);
    return [];
  }
}

export async function sugerirLugaresSabre(
  consulta: string,
): Promise<LugarSugerido[]> {
  const [sabre, estaticos] = await Promise.all([
    sugerirLugaresDesdeSabre(consulta),
    Promise.resolve(sugerirLugaresEstaticos(consulta)),
  ]);

  const mapa = new Map<string, LugarSugerido>();
  for (const lugar of sabre) {
    if (lugar.iata_code) mapa.set(lugar.iata_code, lugar);
    for (const a of lugar.airports ?? []) {
      if (a.iata_code && !mapa.has(a.iata_code)) mapa.set(a.iata_code, {
        id: a.id,
        name: a.name,
        iata_code: a.iata_code,
        iata_city_code: a.iata_city_code,
        city_name: a.city_name,
        iata_country_code: a.iata_country_code,
        latitude: a.latitude,
        longitude: a.longitude,
        type: "airport",
      });
    }
  }
  for (const lugar of estaticos) {
    if (lugar.iata_code && !mapa.has(lugar.iata_code)) mapa.set(lugar.iata_code, lugar);
  }

  return Array.from(mapa.values()).slice(0, 12);
}

export async function aeropuertosDelPaisSabre(
  codigoPais: string,
): Promise<AeropuertoSugerido[]> {
  return aeropuertosDelPaisEstaticos(codigoPais);
}
