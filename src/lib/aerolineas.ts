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

const NOMBRES_PREFERIDOS: Record<string, string> = {
  LA: "LATAM Airlines",
  AM: "Aeroméxico",
  CM: "Copa Airlines",
};

export function nombreAerolinea(iata: string): string {
  const code = iata?.toUpperCase();
  return NOMBRES_PREFERIDOS[code] ?? NOMBRE_POR_IATA.get(code) ?? code ?? "";
}

export function logoAerolinea(iata: string): string | null {
  return LOGO_POR_IATA.get(iata?.toUpperCase()) ?? null;
}
