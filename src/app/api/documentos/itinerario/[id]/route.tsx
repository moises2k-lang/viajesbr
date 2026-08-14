import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DocumentoItinerario } from "@/documentos/DocumentoItinerario";
import { itinerarioParaDocumento } from "@/lib/documentos";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const datos = await itinerarioParaDocumento(id);
  if (!datos) {
    return NextResponse.json({ error: "El itinerario no existe" }, { status: 404 });
  }

  const interno = request.nextUrl.searchParams.get("interno") === "1";
  const pdf = await renderToBuffer(
    <DocumentoItinerario
      itinerario={datos.itinerario}
      bloques={datos.bloques}
      interno={interno}
    />,
  );

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="itinerario-${datos.itinerario.id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
