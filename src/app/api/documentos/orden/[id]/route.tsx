import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DocumentoConfirmacion } from "@/documentos/DocumentoConfirmacion";
import { ordenParaDocumento } from "@/lib/documentos";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const datos = await ordenParaDocumento(id);
  if (!datos) {
    return NextResponse.json({ error: "La reserva no existe" }, { status: 404 });
  }

  const interno = request.nextUrl.searchParams.get("interno") === "1";
  const pdf = await renderToBuffer(
    <DocumentoConfirmacion
      orden={datos.orden}
      pasajeros={datos.pasajeros}
      interno={interno}
    />,
  );

  const nombre = `reserva-${datos.orden.pnr ?? datos.orden.id}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
