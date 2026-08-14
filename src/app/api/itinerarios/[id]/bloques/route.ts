import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import type { Oferta } from "@/lib/duffel";
import { duracionLegible, formatoHora } from "@/lib/marca";

const TIPOS = ["vuelo", "hotel", "traslado", "actividad", "servicio", "nota"];

interface Cuerpo {
  tipo?: unknown;
  titulo?: unknown;
  fecha?: unknown;
  fechaFin?: unknown;
  detalle?: unknown;
  proveedor?: unknown;
  costoNeto?: unknown;
  precioVenta?: unknown;
  cotizacionId?: unknown;
  datos?: unknown;
}

interface CotizacionGuardada extends Record<string, unknown> {
  id: string;
  aerolinea: string | null;
  costo_neto: string;
  precio_venta: string;
  itinerario: Oferta["slices"];
}

function textoDeOferta(rebanadas: Oferta["slices"]): {
  titulo: string;
  fecha: string;
  detalle: string;
} {
  const primera = rebanadas[0];
  const ultima = rebanadas[rebanadas.length - 1];
  const titulo = `${primera.origin.iata_code} – ${ultima.destination.iata_code}`;
  const detalle = rebanadas
    .map((rebanada) => {
      const tramos = rebanada.segments
        .map(
          (s) =>
            `${s.marketing_carrier.iata_code}${s.marketing_carrier_flight_number} ${s.origin.iata_code} ${formatoHora(s.departing_at)} – ${s.destination.iata_code} ${formatoHora(s.arriving_at)}`,
        )
        .join(" · ");
      const escalas = rebanada.segments.length - 1;
      return `${rebanada.origin.iata_code}–${rebanada.destination.iata_code} (${escalas === 0 ? "directo" : `${escalas} escala(s)`}${rebanada.duration ? `, ${duracionLegible(rebanada.duration)}` : ""}): ${tramos}`;
    })
    .join("\n");
  return { titulo, fecha: primera.segments[0].departing_at.slice(0, 10), detalle };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  const [itinerario] = await query<{ id: string }>(
    "SELECT id::text FROM itinerarios WHERE id = $1",
    [id],
  );
  if (!itinerario) {
    return NextResponse.json({ error: "El itinerario no existe" }, { status: 404 });
  }

  const cuerpo = (await request.json()) as Cuerpo;
  let tipo = typeof cuerpo.tipo === "string" && TIPOS.includes(cuerpo.tipo) ? cuerpo.tipo : null;
  let titulo = typeof cuerpo.titulo === "string" ? cuerpo.titulo.trim() : "";
  let fecha = typeof cuerpo.fecha === "string" && cuerpo.fecha ? cuerpo.fecha : null;
  let detalle = typeof cuerpo.detalle === "string" && cuerpo.detalle.trim() ? cuerpo.detalle.trim() : null;
  let proveedor = typeof cuerpo.proveedor === "string" && cuerpo.proveedor.trim() ? cuerpo.proveedor.trim() : null;
  let costoNeto = typeof cuerpo.costoNeto === "number" ? cuerpo.costoNeto : null;
  let precioVenta = typeof cuerpo.precioVenta === "number" ? cuerpo.precioVenta : null;
  const cotizacionId = typeof cuerpo.cotizacionId === "string" && /^\d+$/.test(cuerpo.cotizacionId)
    ? cuerpo.cotizacionId
    : null;
  const datos =
    typeof cuerpo.datos === "object" && cuerpo.datos !== null
      ? JSON.stringify(cuerpo.datos)
      : null;

  if (cotizacionId && (!cuerpo.tipo || cuerpo.tipo === "vuelo")) {
    const [cotizacion] = await query<CotizacionGuardada>(
      `SELECT id::text, aerolinea, costo_neto::text, precio_venta::text, itinerario
         FROM cotizaciones WHERE id = $1`,
      [cotizacionId],
    );
    if (!cotizacion) {
      return NextResponse.json({ error: "La cotización no existe" }, { status: 404 });
    }
    if (!Array.isArray(cotizacion.itinerario) || cotizacion.itinerario.length === 0) {
      return NextResponse.json(
        { error: "La cotización no tiene tramos guardados" },
        { status: 422 },
      );
    }
    const texto = textoDeOferta(cotizacion.itinerario);
    tipo = typeof cuerpo.tipo === "string" && TIPOS.includes(cuerpo.tipo) ? cuerpo.tipo : "vuelo";
    titulo = titulo || texto.titulo;
    fecha = fecha ?? texto.fecha;
    detalle = detalle ?? texto.detalle;
    proveedor = proveedor ?? cotizacion.aerolinea;
    costoNeto = costoNeto ?? Number(cotizacion.costo_neto);
    precioVenta = precioVenta ?? Number(cotizacion.precio_venta);
  }

  if (!tipo || !titulo) {
    return NextResponse.json({ error: "Se requieren tipo y título" }, { status: 400 });
  }

  const [{ siguiente }] = await query<{ siguiente: number }>(
    "SELECT coalesce(max(posicion), 0) + 1 AS siguiente FROM itinerario_bloques WHERE itinerario_id = $1",
    [id],
  );

  const [bloque] = await query<{ id: string }>(
    `INSERT INTO itinerario_bloques
       (itinerario_id, posicion, tipo, titulo, fecha, fecha_fin, detalle, proveedor,
        costo_neto, precio_venta, cotizacion_id, datos)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     RETURNING id::text`,
    [
      id,
      siguiente,
      tipo,
      titulo,
      fecha,
      typeof cuerpo.fechaFin === "string" && cuerpo.fechaFin ? cuerpo.fechaFin : null,
      detalle,
      proveedor,
      costoNeto,
      precioVenta,
      cotizacionId,
      datos,
    ],
  );

  await query("UPDATE itinerarios SET actualizado_en = now() WHERE id = $1", [id]);
  return NextResponse.json({ id: bloque.id }, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const bloqueId = request.nextUrl.searchParams.get("bloque");
  if (!/^\d+$/.test(id) || !bloqueId || !/^\d+$/.test(bloqueId)) {
    return NextResponse.json({ error: "Identificador inválido" }, { status: 400 });
  }

  await query("DELETE FROM itinerario_bloques WHERE id = $1 AND itinerario_id = $2", [
    bloqueId,
    id,
  ]);
  return NextResponse.json({ ok: true });
}
