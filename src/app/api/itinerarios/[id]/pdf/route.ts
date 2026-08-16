import { createElement } from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import EsquemaReservaPDF from "@/components/EsquemaReservaPDF";
import { ofertaRespetaShabbat } from "@/lib/ofertas";
import { duracionLegible } from "@/lib/marca";
import { renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

interface AeropuertoCoord {
  lat: number;
  lon: number;
  nombre?: string;
  pais?: string;
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
  cotizacion_id: number | null;
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

function pngDimensions(buffer: Buffer): { width: number; height: number } {
  if (buffer.length < 24) throw new Error("PNG demasiado pequeño");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function datosAeropuerto(iata: string): Promise<AeropuertoCoord | null> {
  const token = process.env.DUFFEL_API_TOKEN;
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://api.duffel.com/places/suggestions?query=${encodeURIComponent(iata)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Duffel-Version": "v2",
          Accept: "application/json",
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    if (!res.ok) return null;

    const json = (await res.json()) as Record<string, unknown>;
    const data = Array.isArray(json.data) ? json.data : [];
    const aeropuerto = data.find(
      (item: any) => item?.type === "airport" && item?.iata_code === iata,
    ) as any;
    if (!aeropuerto) return null;

    const lat = typeof aeropuerto.latitude === "number" ? aeropuerto.latitude : parseFloat(aeropuerto.latitude);
    const lon = typeof aeropuerto.longitude === "number" ? aeropuerto.longitude : parseFloat(aeropuerto.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    return {
      lat,
      lon,
      nombre: typeof aeropuerto.name === "string" ? aeropuerto.name : undefined,
      pais: typeof aeropuerto.iata_country_code === "string" ? aeropuerto.iata_country_code : undefined,
    };
  } catch (error) {
    console.error(`Error obteniendo datos de ${iata}:`, error);
    return null;
  }
}

async function datosAeropuertos(iatas: string[]): Promise<Record<string, AeropuertoCoord | null>> {
  const resultado: Record<string, AeropuertoCoord | null> = {};
  await Promise.all(
    iatas.map(async (iata) => {
      resultado[iata] = await datosAeropuerto(iata);
    }),
  );
  return resultado;
}

async function banderaPais(codigo: string | undefined): Promise<Buffer | null> {
  if (!codigo) return null;
  try {
    const res = await fetch(`https://flagsapi.com/${encodeURIComponent(codigo.toUpperCase())}/shiny/64.png`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const array = new Uint8Array(await res.arrayBuffer());
    if (array.length < 100) return null;
    return Buffer.from(array);
  } catch (error) {
    console.error(`Error obteniendo bandera de ${codigo}:`, error);
    return null;
  }
}

interface SliceRaw {
  origin?: { iata_code?: string };
  destination?: { iata_code?: string };
  duration?: string | null;
  segments?: Array<Record<string, unknown>>;
}

function resumenTramos(slices: SliceRaw[]): string {
  return slices.map((s) => `${s.origin?.iata_code ?? ""}-${s.destination?.iata_code ?? ""}`).join(" / ");
}

function duracionTotal(slices: SliceRaw[]): string {
  const partes = slices.map((s) => duracionLegible(s.duration ?? "")).filter(Boolean);
  return partes.length ? partes.join(" / ") : "—";
}

async function cargarAlternativas(bloques: Bloque[]): Promise<any[]> {
  const vuelo = bloques.find((b) => b.tipo === "vuelo" && b.cotizacion_id);
  if (!vuelo?.cotizacion_id) return [];
  try {
    const filas = await query<Record<string, unknown>>(
      `SELECT c.id::text, c.duffel_offer_id, c.aerolinea, c.moneda, c.precio_venta::float, c.itinerario
         FROM cotizaciones c
         JOIN (SELECT busqueda_id FROM cotizaciones WHERE id = $1) b ON b.busqueda_id = c.busqueda_id
        WHERE c.id <> $1
        ORDER BY c.precio_venta
        LIMIT 8`,
      [vuelo.cotizacion_id],
    );
    const alternativas: any[] = [];
    for (const f of filas) {
      const raw = typeof f.itinerario === "string" ? JSON.parse(f.itinerario) : f.itinerario;
      const slices: SliceRaw[] = Array.isArray(raw) ? raw : [];
      if (!ofertaRespetaShabbat({ slices } as any)) continue;
      alternativas.push({
        ofertaId: String(f.duffel_offer_id ?? ""),
        aerolinea: String(f.aerolinea ?? ""),
        precioVenta: Number(f.precio_venta ?? 0),
        moneda: String(f.moneda ?? "USD"),
        duracion: duracionTotal(slices),
        tramosResumen: resumenTramos(slices),
      });
    }
    return alternativas;
  } catch (e) {
    console.error("Error cargando alternativas:", e);
    return [];
  }
}

function cargarMapaMundo() {
  try {
    const ruta = join(process.cwd(), "public", "worldmap.png");
    const buffer = readFileSync(ruta);
    const { width, height } = pngDimensions(buffer);
    return { src: buffer, width, height };
  } catch (error) {
    console.error("No se pudo cargar el mapa del mundo:", error);
    return undefined;
  }
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
            detalle, proveedor, costo_neto::float, precio_venta::float, cotizacion_id, datos
       FROM itinerario_bloques
      WHERE itinerario_id = $1
      ORDER BY posicion`,
    [id],
  );

  const iatas = extraerIatas(bloques as Bloque[]);
  const aeropuertos = iatas.length > 0 ? await datosAeropuertos(iatas) : {};

  const banderas: Record<string, Buffer> = {};
  await Promise.all(
    iatas.map(async (iata) => {
      const pais = aeropuertos[iata]?.pais;
      if (pais) {
        const buffer = await banderaPais(pais);
        if (buffer) banderas[iata] = buffer;
      }
    }),
  );

  const mapa = cargarMapaMundo();
  const alternativas = await cargarAlternativas(bloques as Bloque[]);

  try {
    const buffer = await renderToBuffer(
      createElement(EsquemaReservaPDF, {
        itinerario: itinerario as Itinerario,
        bloques: bloques as Bloque[],
        aeropuertos,
        mapa,
        banderas,
        alternativas,
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
