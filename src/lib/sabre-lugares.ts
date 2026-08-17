import { sabreFetch } from "@/lib/sabre";
import type { AeropuertoSugerido, LugarSugerido } from "@/lib/duffel";

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

interface MACResponse {
  Cities?: {
    code?: string;
    name?: string;
    countryCode?: string;
    countryName?: string;
  }[];
}

interface AirportsAtCityResponse {
  Airports?: { code?: string; name?: string }[];
}

function parseCoord(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function sugerirLugaresSabre(
  consulta: string,
): Promise<LugarSugerido[]> {
  const texto = consulta.trim();
  if (texto.length < 3) return [];

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
    if (!code) continue;
    if (ciudades.has(code)) continue;
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
}

export async function aeropuertosDelPaisSabre(
  codigoPais: string,
): Promise<AeropuertoSugerido[]> {
  const data = await sabreFetch<MACResponse>(
    `/v1/lists/supported/cities?country=${encodeURIComponent(codigoPais)}`,
    { method: "GET" },
  );

  const cities = (data.Cities ?? []).filter((c) => c.code);
  const results: AeropuertoSugerido[] = [];

  for (const city of cities.slice(0, 30)) {
    try {
      const apData = await sabreFetch<AirportsAtCityResponse>(
        `/v1/lists/supported/cities/${encodeURIComponent(city.code!)}/airports`,
        { method: "GET" },
      );
      for (const ap of apData.Airports ?? []) {
        if (!ap.code) continue;
        results.push({
          id: `sabre-airport-${ap.code}`,
          name: ap.name ?? ap.code,
          iata_code: ap.code,
          iata_city_code: city.code ?? null,
          city_name: city.name ?? null,
          iata_country_code: city.countryCode ?? codigoPais,
          latitude: null,
          longitude: null,
        });
      }
    } catch {
      // Ignorar ciudades sin aeropuertos o sin acceso
    }
  }

  return results;
}
