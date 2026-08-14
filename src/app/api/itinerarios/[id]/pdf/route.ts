import { createElement } from "react";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import EsquemaReservaPDF from "@/components/EsquemaReservaPDF";
import { renderToBuffer } from "@react-pdf/renderer";

export const runtime = "nodejs";

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

  try {
    const buffer = await renderToBuffer(
      createElement(EsquemaReservaPDF, {
        itinerario: itinerario as Itinerario,
        bloques: bloques as Bloque[],
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
