import { NextResponse } from "next/server";
import { aeropuertosDelPais, sugerirLugares, type AeropuertoSugerido } from "@/lib/duffel";
import { bandera, nombrePais } from "@/lib/paises";
import type { OpcionLugar } from "@/app/api/lugares/route";

export const runtime = "nodejs";

/** Distancia aproximada en kilómetros entre dos coordenadas (haversine). */
function distanciaKm(
  latitudA: number,
  longitudA: number,
  latitudB: number,
  longitudB: number,
): number {
  const radianes = (grados: number) => (grados * Math.PI) / 180;
  const seno = (valor: number) => Math.sin(valor / 2) ** 2;
  const a =
    seno(radianes(latitudB - latitudA)) +
    Math.cos(radianes(latitudA)) *
      Math.cos(radianes(latitudB)) *
      seno(radianes(longitudB - longitudA));
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function aOpcion(aeropuerto: AeropuertoSugerido, ciudadPorDefecto: string): OpcionLugar | null {
  if (!aeropuerto.iata_code) return null;
  const pais = aeropuerto.iata_country_code ?? null;
  return {
    codigo: aeropuerto.iata_code,
    nombre: aeropuerto.name,
    ciudad: aeropuerto.city_name ?? ciudadPorDefecto,
    pais: pais ? nombrePais(pais) : null,
    bandera: pais ? bandera(pais) : null,
    tipo: "aeropuerto",
  };
}

/**
 * Devuelve el aeropuerto más cercano a la ubicación que reporta la red del visitante.
 * Sin cabeceras de geolocalización no inventa nada: responde { opcion: null }.
 */
export async function GET(request: Request) {
  const ciudad = request.headers.get("x-vercel-ip-city");
  const pais = request.headers.get("x-vercel-ip-country");
  const latitud = Number(request.headers.get("x-vercel-ip-latitude"));
  const longitud = Number(request.headers.get("x-vercel-ip-longitude"));

  const consulta = ciudad ? decodeURIComponent(ciudad) : null;
  if (!consulta) {
    return NextResponse.json({ opcion: null, motivo: "sin ubicación en la petición" });
  }

  async function candidatos(texto: string): Promise<AeropuertoSugerido[]> {
    const lugares = await sugerirLugares(texto);
    const lista: AeropuertoSugerido[] = [];
    for (const lugar of lugares) {
      if (lugar.type === "airport") {
        lista.push(lugar);
        continue;
      }
      for (const aeropuerto of lugar.airports ?? []) {
        lista.push({
          ...aeropuerto,
          iata_country_code: aeropuerto.iata_country_code ?? lugar.iata_country_code ?? null,
          city_name: aeropuerto.city_name ?? lugar.name,
        });
      }
    }
    return pais
      ? lista.filter((a) => a.iata_country_code?.toUpperCase() === pais.toUpperCase())
      : lista;
  }

  let lista: AeropuertoSugerido[];
  try {
    lista = await candidatos(consulta);
    // La ciudad de la red puede no tener aeropuerto: se toma el más cercano del país.
    if (lista.length === 0 && pais && Number.isFinite(latitud) && Number.isFinite(longitud)) {
      lista = await aeropuertosDelPais(pais);
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  if (lista.length === 0) {
    return NextResponse.json({
      opcion: null,
      motivo: `sin aeropuertos para ${consulta}${pais ? ` (${pais})` : ""}`,
    });
  }

  /** Duffel sólo sugiere aeropuertos con servicio comercial: así se descartan aeródromos. */
  async function tieneServicioComercial(codigo: string): Promise<boolean> {
    const sugeridos = await sugerirLugares(codigo);
    return sugeridos.some((lugar) => lugar.iata_code === codigo);
  }

  const cercanos = lista
    .filter((a) => typeof a.latitude === "number" && typeof a.longitude === "number")
    .sort(
      (a, b) =>
        distanciaKm(latitud, longitud, a.latitude as number, a.longitude as number) -
        distanciaKm(latitud, longitud, b.latitude as number, b.longitude as number),
    );

  if (!Number.isFinite(latitud) || !Number.isFinite(longitud) || cercanos.length === 0) {
    return NextResponse.json({ opcion: aOpcion(lista[0], consulta) });
  }

  for (const candidato of cercanos.slice(0, 6)) {
    if (candidato.iata_code && (await tieneServicioComercial(candidato.iata_code))) {
      return NextResponse.json({ opcion: aOpcion(candidato, consulta) });
    }
  }

  return NextResponse.json({ opcion: aOpcion(cercanos[0], consulta) });
}
