import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { reglasActivas } from "@/lib/markup";

export const runtime = "nodejs";

const esquema = z.object({
  nombre: z.string().trim().min(1),
  prioridad: z.number().int().min(1).max(9999),
  aerolineaIata: z.string().trim().length(2).nullish(),
  origen: z.string().trim().length(3).nullish(),
  destino: z.string().trim().length(3).nullish(),
  moneda: z.string().trim().length(3).nullish(),
  porcentaje: z.number().min(0).max(100),
  montoFijo: z.number().min(0),
  montoMinimo: z.number().min(0),
});

export async function GET() {
  return NextResponse.json({ reglas: await reglasActivas() });
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validado = esquema.safeParse(cuerpo);
  if (!validado.success) {
    return NextResponse.json(
      { error: "Regla inválida", detalle: validado.error.issues },
      { status: 400 },
    );
  }
  const r = validado.data;

  const [regla] = await query<{ id: string }>(
    `INSERT INTO reglas_markup (nombre, prioridad, aerolinea_iata, origen, destino, moneda,
                                porcentaje, monto_fijo, monto_minimo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id::text`,
    [
      r.nombre,
      r.prioridad,
      r.aerolineaIata?.toUpperCase() ?? null,
      r.origen?.toUpperCase() ?? null,
      r.destino?.toUpperCase() ?? null,
      r.moneda?.toUpperCase() ?? null,
      r.porcentaje,
      r.montoFijo,
      r.montoMinimo,
    ],
  );

  return NextResponse.json({ id: regla.id });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }
  await query(`UPDATE reglas_markup SET activa = false, actualizado_en = now() WHERE id = $1`, [id]);
  return NextResponse.json({ ok: true });
}
