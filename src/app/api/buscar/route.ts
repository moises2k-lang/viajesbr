import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarOfertas, type Oferta } from "@/lib/duffel";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { bandera, nombrePais } from "@/lib/paises";
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

const MAXIMO_OFERTAS = 150;

function minutosEntre(desde: string, hasta: string): number {
  return Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60000);
}

export interface OfertaConPrecio {
  ofertaId: string;
  cotizacionId?: string | null;
  aerolinea: string;
  aerolineaIata: string;
  logo: string | null;
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
    origenNombre: string;
    destinoNombre: string;
    origenCiudad: string | null;
    destinoCiudad: string | null;
    origenPais: string | null;
    destinoPais: string | null;
    origenBandera: string | null;
    destinoBandera: string | null;
    duracion: string | null;
    minutos: number;
    escalas: number;
    marcaTarifa: string | null;
    equipaje: { tipo: string; cantidad: number }[];
    segmentos: {
      vuelo: string;
      origen: string;
      destino: string;
      origenNombre: string;
      destinoNombre: string;
      origenBandera: string | null;
      destinoBandera: string | null;
      sale: string;
      llega: string;
      minutos: number;
      esperaMinutos: number | null;
      cabina: string | null;
      aerolinea: string;
      avion: string | null;
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
    logo: oferta.owner.logo_symbol_url ?? null,
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
      origenNombre: tramo.origin.name,
      destinoNombre: tramo.destination.name,
      origenCiudad: tramo.origin.city_name ?? null,
      destinoCiudad: tramo.destination.city_name ?? null,
      origenPais: tramo.origin.iata_country_code
        ? nombrePais(tramo.origin.iata_country_code)
        : null,
      destinoPais: tramo.destination.iata_country_code
        ? nombrePais(tramo.destination.iata_country_code)
        : null,
      origenBandera: tramo.origin.iata_country_code
        ? bandera(tramo.origin.iata_country_code)
        : null,
      destinoBandera: tramo.destination.iata_country_code
        ? bandera(tramo.destination.iata_country_code)
        : null,
      duracion: tramo.duration ?? null,
      minutos: minutosEntre(
        tramo.segments[0].departing_at,
        tramo.segments[tramo.segments.length - 1].arriving_at,
      ),
      escalas: tramo.segments.length - 1,
      marcaTarifa: tramo.fare_brand_name ?? null,
      equipaje: tramo.segments[0]?.passengers?.[0]?.baggages?.map((b) => ({
        tipo: b.type,
        cantidad: b.quantity,
      })) ?? [],
      segmentos: tramo.segments.map((segmento, indice) => ({
        vuelo: `${segmento.marketing_carrier.iata_code}${segmento.marketing_carrier_flight_number}`,
        origen: segmento.origin.iata_code,
        destino: segmento.destination.iata_code,
        origenNombre: segmento.origin.name,
        destinoNombre: segmento.destination.name,
        origenBandera: segmento.origin.iata_country_code
          ? bandera(segmento.origin.iata_country_code)
          : null,
        destinoBandera: segmento.destination.iata_country_code
          ? bandera(segmento.destination.iata_country_code)
          : null,
        sale: segmento.departing_at,
        llega: segmento.arriving_at,
        minutos: minutosEntre(segmento.departing_at, segmento.arriving_at),
        esperaMinutos:
          indice === 0
            ? null
            : minutosEntre(tramo.segments[indice - 1].arriving_at, segmento.departing_at),
        cabina: segmento.passengers?.[0]?.cabin_class_marketing_name ?? null,
        aerolinea: segmento.marketing_carrier.name,
        avion: segmento.aircraft?.name ?? null,
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

  const mostradas = ofertas.slice(0, MAXIMO_OFERTAS);
  const valores: unknown[] = [];
  const filas = mostradas.map(({ oferta, precio }, indice) => {
    const base = indice * 11;
    valores.push(
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
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11})`;
  });

  const cotizaciones = filas.length
    ? await query<{ id: string; duffel_offer_id: string }>(
        `INSERT INTO cotizaciones (busqueda_id, duffel_offer_id, aerolinea, aerolinea_iata, moneda,
                                   costo_neto, markup, precio_venta, regla_markup_id, expira_en, itinerario)
         VALUES ${filas.join(",")}
         RETURNING id::text, duffel_offer_id`,
        valores,
      )
    : [];
  const porOferta = new Map(cotizaciones.map((c) => [c.duffel_offer_id, c.id]));

  return NextResponse.json({
    busquedaId: busqueda.id,
    solicitudId: solicitud.id,
    total: ofertas.length,
    ofertas: mostradas.map(({ oferta, precio }) => ({
      ...normalizarOferta(oferta, precio),
      cotizacionId: porOferta.get(oferta.id) ?? null,
    })),
  });
}
