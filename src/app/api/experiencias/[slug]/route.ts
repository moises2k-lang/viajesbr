import { NextResponse } from "next/server";
import { paquetePorSlug } from "@/lib/experiencias";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    const paquete = await paquetePorSlug(slug);
    if (!paquete) {
      return NextResponse.json({ error: "Paquete no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ paquete });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
