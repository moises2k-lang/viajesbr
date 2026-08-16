import { createElement } from "react";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import EsquemaReservaPDF from "@/components/EsquemaReservaPDF";
import { renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

interface AeropuertoCoord {
  lat: number;
  lon: number;
  nombre?: string;
}

interface Itinerario {
  id: string;
  titulo: string;
  cliente: string;
  resumen: string | null;
  moneda: string;
  estado: string;
  creado_en: string;
}

interface Bloque {
  id: string;
  posicion: number;
  tipo: string;
  titulo: string;
  fecha: string | null;
  fecha_fin: string | null;
  detalle: string | null;
  proveedor: string | null;
  costo_neto: number | null;
  precio_venta: number | null;
  datos: unknown;
}

function extraerIatas(bloques: Bloque[]): string[] {
  const iatas = new Set<string>();
  for (const bloque of bloques) {
    if (bloque.tipo !== "vuelo") continue;
    const datos =
      typeof bloque.datos === "object" && bloque.datos !== null
        ? (bloque.datos as Record<string, unknown>)
        : null;
    const oferta = datos?.oferta as Record<string, unknown> | undefined;
    const tramos = Array.isArray(oferta?.tramos) ? oferta.tramos : [];
    for (const tramo of tramos) {
      const t = tramo as Record<string, unknown>;
      const segmentos = Array.isArray(t.segmentos) ? t.segmentos : [];
      for (const segmento of segmentos) {
        const s = segmento as Record<string, unknown>;
        if (typeof s.origen === "string") iatas.add(s.origen);
        if (typeof s.destino === "string") iatas.add(s.destino);
      }
    }
  }
  return [...iatas];
}

async function coordenadasAeropuerto(iata: string): Promise<AeropuertoCoord | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://airportsapi.com/api/airports/${encodeURIComponent(iata)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = (await res.json()) as Record<string, unknown>;
    const payload =
      typeof json.data === "object" && json.data !== null
        ? (json.data as Record<string, unknown>)
        : json;
    const attrs =
      typeof payload.attributes === "object" && payload.attributes !== null
        ? (payload.attributes as Record<string, unknown>)
        : payload;
    const latRaw = attrs.latitude ?? payload.latitude ?? json.latitude;
    const lonRaw = attrs.longitude ?? payload.longitude ?? json.longitude;
    const lat = typeof latRaw === "number" ? latRaw : parseFloat(latRaw as string);
    const lon = typeof lonRaw === "number" ? lonRaw : parseFloat(lonRaw as string);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    const nameRaw = attrs.name ?? payload.name ?? json.name;
    return {
      lat,
      lon,
      nombre: typeof nameRaw === "string" ? nameRaw : undefined,
    };
  } catch (error) {
    console.error(`Error obteniendo coordenadas de ${iata}:`, error);
    return null;
  }
}

async function coordenadasAeropuertos(iatas: string[]): Promise<Record<string, AeropuertoCoord | null>> {
  const resultado: Record<string, AeropuertoCoord | null> = {};
  await Promise.all(
    iatas.map(async (iata) => {
      resultado[iata] = await coordenadasAeropuerto(iata);
    }),
  );
  return resultado;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const [itinerario] = await query<Itinerario & Record<string, unknown>>(
    `SELECT id::text, titulo, cliente, resumen, moneda, estado, creado_en
       FROM itinerarios WHERE id = $1`,
    [id],
  );
  if (!itinerario) {
    return NextResponse.json({ error: "Itinerario no encontrado" }, { status: 404 });
  }

  const bloques = await query<Bloque & Record<string, unknown>>(
    `SELECT id::text, posicion, tipo, titulo, fecha::text, fecha_fin::text,
            detalle, proveedor, costo_neto::float, precio_venta::float, datos
       FROM itinerario_bloques
      WHERE itinerario_id = $1
      ORDER BY posicion`,
    [id],
  );

  const iatas = extraerIatas(bloques as Bloque[]);
  const aeropuertos = iatas.length > 0 ? await coordenadasAeropuertos(iatas) : {};

  try {
    const buffer = await renderToBuffer(
      createElement(EsquemaReservaPDF, {
        itinerario: itinerario as Itinerario,
        bloques: bloques as Bloque[],
        aeropuertos,
      }) as any,
    );
    const pdf = new Uint8Array(buffer);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="itinerario-${id}.pdf"`,
      },
    });
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Error al generar PDF";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
