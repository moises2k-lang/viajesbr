import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";

interface Cuerpo {
  titulo?: unknown;
  cliente?: unknown;
  resumen?: unknown;
  moneda?: unknown;
  estado?: unknown;
}

const ESTADOS = ["borrador", "cotizacion", "confirmado", "cancelado"];

export async function GET() {
  const itinerarios = await query<Record<string, unknown>>(
    `SELECT i.id::text, i.creado_en, i.titulo, i.cliente, i.moneda, i.estado,
            count(b.id)::int AS bloques,
            coalesce(sum(b.precio_venta), 0)::text AS total
       FROM itinerarios i
       LEFT JOIN itinerario_bloques b ON b.itinerario_id = i.id
      GROUP BY i.id
      ORDER BY i.creado_en DESC`,
  );
  return NextResponse.json({ itinerarios });
}

export async function POST(request: NextRequest) {
  const cuerpo = (await request.json()) as Cuerpo;
  const titulo = typeof cuerpo.titulo === "string" ? cuerpo.titulo.trim() : "";
  const cliente = typeof cuerpo.cliente === "string" ? cuerpo.cliente.trim() : "";
  const moneda = typeof cuerpo.moneda === "string" ? cuerpo.moneda.trim().toUpperCase() : "";

  if (!titulo || !cliente || !/^[A-Z]{3}$/.test(moneda)) {
    return NextResponse.json(
      { error: "Se requieren título, cliente y moneda de tres letras" },
      { status: 400 },
    );
  }

  const estado = typeof cuerpo.estado === "string" && ESTADOS.includes(cuerpo.estado)
    ? cuerpo.estado
    : "borrador";

  const [itinerario] = await query<{ id: string }>(
    `INSERT INTO itinerarios (titulo, cliente, resumen, moneda, estado)
     VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
    [titulo, cliente, typeof cuerpo.resumen === "string" ? cuerpo.resumen.trim() : null, moneda, estado],
  );

  return NextResponse.json({ id: itinerario.id }, { status: 201 });
}
