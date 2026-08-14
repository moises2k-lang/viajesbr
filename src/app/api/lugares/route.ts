import { NextResponse } from "next/server";
import { sugerirLugares } from "@/lib/duffel";

export const runtime = "nodejs";

export interface OpcionLugar {
  codigo: string;
  nombre: string;
  ciudad: string | null;
  tipo: "ciudad" | "aeropuerto";
}

export async function GET(request: Request) {
  const consulta = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (consulta.length < 2) {
    return NextResponse.json({ opciones: [] });
  }

  let lugares;
  try {
    lugares = await sugerirLugares(consulta);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  const opciones: OpcionLugar[] = [];
  for (const lugar of lugares) {
    if (lugar.type === "city") {
      if (lugar.iata_code) {
        opciones.push({
          codigo: lugar.iata_code,
          nombre: lugar.name,
          ciudad: null,
          tipo: "ciudad",
        });
      }
      for (const aeropuerto of lugar.airports ?? []) {
        if (aeropuerto.iata_code) {
          opciones.push({
            codigo: aeropuerto.iata_code,
            nombre: aeropuerto.name,
            ciudad: aeropuerto.city_name ?? lugar.name,
            tipo: "aeropuerto",
          });
        }
      }
      continue;
    }
    if (lugar.iata_code) {
      opciones.push({
        codigo: lugar.iata_code,
        nombre: lugar.name,
        ciudad: lugar.city_name ?? null,
        tipo: "aeropuerto",
      });
    }
  }

  const vistos = new Set<string>();
  const unicas = opciones.filter((opcion) => {
    const llave = `${opcion.tipo}-${opcion.codigo}`;
    if (vistos.has(llave)) return false;
    vistos.add(llave);
    return true;
  });

  return NextResponse.json({ opciones: unicas.slice(0, 12) });
}
