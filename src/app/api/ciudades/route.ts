import { NextResponse } from "next/server";
import { sugerirCiudades } from "@/lib/liteapi";
import { bandera, codigoPais } from "@/lib/paises";

export const runtime = "nodejs";

export interface OpcionCiudad {
  placeId: string;
  nombre: string;
  detalle: string;
  pais: string | null;
  bandera: string | null;
}

/** liteAPI etiqueta los destinos; los de ciudad o región son los útiles para hoteles. */
const TIPOS_UTILES = [
  "locality",
  "sublocality",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "country",
  "natural_feature",
  "tourist_attraction",
  "airport",
];

export async function GET(request: Request) {
  const consulta = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (consulta.length < 3) {
    return NextResponse.json({ opciones: [] });
  }

  let lugares;
  try {
    lugares = await sugerirCiudades(consulta);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  const opciones: OpcionCiudad[] = [];
  for (const lugar of lugares) {
    const tipos = lugar.types ?? [];
    if (tipos.length > 0 && !tipos.some((tipo) => TIPOS_UTILES.includes(tipo))) continue;
    const partes = lugar.formattedAddress.split(",").map((parte) => parte.trim());
    const pais = codigoPais(partes[partes.length - 1] ?? "");
    opciones.push({
      placeId: lugar.placeId,
      nombre: lugar.displayName,
      detalle: lugar.formattedAddress,
      pais,
      bandera: pais ? bandera(pais) : null,
    });
  }

  return NextResponse.json({ opciones: opciones.slice(0, 8) });
}
