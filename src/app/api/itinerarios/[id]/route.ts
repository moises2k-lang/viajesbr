import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";

const ESTADOS = ["borrador", "cotizacion", "confirmado", "cancelado"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const cuerpo = (await request.json()) as { estado?: unknown; resumen?: unknown };
  if (typeof cuerpo.estado === "string") {
    if (!ESTADOS.includes(cuerpo.estado)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }
    await query(
      "UPDATE itinerarios SET estado = $2, actualizado_en = now() WHERE id = $1",
      [id, cuerpo.estado],
    );
  }
  if (typeof cuerpo.resumen === "string") {
    await query(
      "UPDATE itinerarios SET resumen = $2, actualizado_en = now() WHERE id = $1",
      [id, cuerpo.resumen.trim() || null],
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }
  await query("DELETE FROM itinerarios WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
