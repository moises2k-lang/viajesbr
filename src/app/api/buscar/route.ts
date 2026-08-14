import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarOfertas, type Oferta } from "@/lib/duffel";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const esquema = z.object({
  origen: z.string().trim().length(3),
  destino: z.string().trim().length(3),
  fechaSalida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fechaRegreso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  adultos: z.number().int().min(1).max(9),
  menores: z.array(z.number().int().min(0).max(17)).max(8).default([]),
  bebes: z.number().int().min(0).max(4).default(0),
  cabina: z.enum(["economy", "premium_economy", "business", "first"]).nullish(),
});

export interface OfertaConPrecio {
  ofertaId: string;
  aerolinea: string;
  aerolineaIata: string;
  moneda: string;
  costoNeto: number;
  markup: number;
  precioVenta: number;
  expiraEn: string;
  cambiosPermitidos: boolean | null;
  reembolsoPermitido: boolean | null;
  pasajeros: { tipo: string; edad: number | null }[];
  tramos: {
    origen: string;
    destino: string;
    duracion: string | null;
    marcaTarifa: string | null;
    equipaje: { tipo: string; cantidad: number }[];
    segmentos: {
      vuelo: string;
      origen: string;
      destino: string;
      sale: string;
      llega: string;
      cabina: string | null;
      aerolinea: string;
    }[];
  }[];
}

function normalizarOferta(
  oferta: Oferta,
  precio: { costoNeto: number; markup: number; precioVenta: number },
): OfertaConPrecio {
  return {
    ofertaId: oferta.id,
    aerolinea: oferta.owner.name,
    aerolineaIata: oferta.owner.iata_code,
    moneda: oferta.total_currency,
    costoNeto: precio.costoNeto,
    markup: precio.markup,
    precioVenta: precio.precioVenta,
    expiraEn: oferta.expires_at,
    cambiosPermitidos: oferta.conditions?.change_before_departure?.allowed ?? null,
    reembolsoPermitido: oferta.conditions?.refund_before_departure?.allowed ?? null,
    pasajeros: oferta.passengers.map((p) => ({
      tipo: p.type ?? (typeof p.age === "number" ? "child" : "adult"),
      edad: typeof p.age === "number" ? p.age : null,
    })),
    tramos: oferta.slices.map((tramo) => ({
      origen: tramo.origin.iata_code,
      destino: tramo.destination.iata_code,
      duracion: tramo.duration ?? null,
      marcaTarifa: tramo.fare_brand_name ?? null,
      equipaje: tramo.segments[0]?.passengers?.[0]?.baggages?.map((b) => ({
        tipo: b.type,
        cantidad: b.quantity,
      })) ?? [],
      segmentos: tramo.segments.map((segmento) => ({
        vuelo: `${segmento.marketing_carrier.iata_code}${segmento.marketing_carrier_flight_number}`,
        origen: segmento.origin.iata_code,
        destino: segmento.destination.iata_code,
        sale: segmento.departing_at,
        llega: segmento.arriving_at,
        cabina: segmento.passengers?.[0]?.cabin_class_marketing_name ?? null,
        aerolinea: segmento.marketing_carrier.name,
      })),
    })),
  };
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
      { error: "Parámetros inválidos", detalle: validado.error.issues },
      { status: 400 },
    );
  }
  const p = validado.data;

  let solicitud;
  try {
    solicitud = await buscarOfertas({
      origen: p.origen.toUpperCase(),
      destino: p.destino.toUpperCase(),
      fechaSalida: p.fechaSalida,
      fechaRegreso: p.fechaRegreso ?? null,
      adultos: p.adultos,
      menores: p.menores,
      bebes: p.bebes,
      cabina: p.cabina ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  const reglas = await reglasActivas();
  const ofertas = solicitud.offers
    .map((oferta) => {
      const precio = calcularPrecio(Number(oferta.total_amount), {
        aerolineaIata: oferta.owner.iata_code,
        origen: p.origen.toUpperCase(),
        destino: p.destino.toUpperCase(),
        moneda: oferta.total_currency,
      }, reglas);
      return { oferta, precio };
    })
    .sort((a, b) => a.precio.precioVenta - b.precio.precioVenta);

  const [busqueda] = await query<{ id: string }>(
    `INSERT INTO busquedas (origen, destino, fecha_salida, fecha_regreso, adultos, menores, bebes,
                            cabina, duffel_offer_request_id, ofertas_encontradas, origen_solicitud)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id::text`,
    [
      p.origen.toUpperCase(),
      p.destino.toUpperCase(),
      p.fechaSalida,
      p.fechaRegreso ?? null,
      p.adultos,
      p.menores.length,
      p.bebes,
      p.cabina ?? null,
      solicitud.id,
      ofertas.length,
      "web",
    ],
  );

  for (const { oferta, precio } of ofertas.slice(0, 30)) {
    await query(
      `INSERT INTO cotizaciones (busqueda_id, duffel_offer_id, aerolinea, aerolinea_iata, moneda,
                                 costo_neto, markup, precio_venta, regla_markup_id, expira_en, itinerario)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        busqueda.id,
        oferta.id,
        oferta.owner.name,
        oferta.owner.iata_code,
        oferta.total_currency,
        precio.costoNeto,
        precio.markup,
        precio.precioVenta,
        precio.reglaId,
        oferta.expires_at,
        JSON.stringify(oferta.slices),
      ],
    );
  }

  return NextResponse.json({
    busquedaId: busqueda.id,
    solicitudId: solicitud.id,
    total: ofertas.length,
    ofertas: ofertas.slice(0, 30).map(({ oferta, precio }) => normalizarOferta(oferta, precio)),
  });
}
