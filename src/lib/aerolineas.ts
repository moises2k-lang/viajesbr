import rawAirlines from "@/data/airlines.json";

interface AirlineData {
  name: string;
  code: string;
  is_lowcost?: boolean;
  logo?: string;
}

const NOMBRE_POR_IATA = new Map<string, string>();
const LOGO_POR_IATA = new Map<string, string>();

for (const a of rawAirlines as unknown as AirlineData[]) {
  const code = a.code?.toUpperCase();
  if (code && code.length === 2 && a.name) {
    if (!NOMBRE_POR_IATA.has(code)) {
      NOMBRE_POR_IATA.set(code, a.name);
      if (a.logo) LOGO_POR_IATA.set(code, a.logo);
    }
  }
}

export function nombreAerolinea(iata: string): string {
  return NOMBRE_POR_IATA.get(iata?.toUpperCase()) ?? iata?.toUpperCase() ?? "";
}

export function logoAerolinea(iata: string): string | null {
  return LOGO_POR_IATA.get(iata?.toUpperCase()) ?? null;
}
