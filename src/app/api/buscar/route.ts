import { NextResponse } from "next/server";
import { z } from "zod";
import { buscarOfertas } from "@/lib/duffel";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { armarOpcionesPorTramo, normalizarOferta } from "@/lib/ofertas";
import { query } from "@/lib/db";

export type {
  OfertaConPrecio,
  OpcionTramo,
  CombinacionTramos,
  AerolineaResumen,
} from "@/lib/ofertas";

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
  tramos: z
    .array(
      z.object({
        origen: z.string().trim().length(3),
        destino: z.string().trim().length(3),
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(2)
    .max(5)
    .nullish(),
});

const MAXIMO_OFERTAS = 150;

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
  /** En multiciudad el "origen" y "destino" de la búsqueda son el primero y el último tramo. */
  const multiciudad =
    p.tramos && p.tramos.length > 1
      ? p.tramos.map((tramo) => ({
          origen: tramo.origen.toUpperCase(),
          destino: tramo.destino.toUpperCase(),
          fecha: tramo.fecha,
        }))
      : null;
  const origenBusqueda = multiciudad
    ? multiciudad[0].origen
    : p.origen.toUpperCase();
  const destinoBusqueda = multiciudad
    ? multiciudad[multiciudad.length - 1].destino
    : p.destino.toUpperCase();
  const fechaBusqueda = multiciudad ? multiciudad[0].fecha : p.fechaSalida;

  let solicitud;
  try {
    solicitud = await buscarOfertas({
      origen: p.origen.toUpperCase(),
      destino: p.destino.toUpperCase(),
      fechaSalida: p.fechaSalida,
      fechaRegreso: p.fechaRegreso ?? null,
      tramos: multiciudad,
      adultos: p.adultos,
      menores: p.menores,
      bebes: p.bebes,
      cabina: p.cabina ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502 },
    );
  }

  const reglas = await reglasActivas();
  const ofertas = solicitud.offers
    .map((oferta) => {
      const precio = calcularPrecio(
        Number(oferta.total_amount),
        {
          aerolineaIata: oferta.owner.iata_code,
          origen: origenBusqueda,
          destino: destinoBusqueda,
          moneda: oferta.total_currency,
        },
        reglas,
      );
      return { oferta, precio };
    })
    .sort((a, b) => a.precio.precioVenta - b.precio.precioVenta);

  const [busqueda] = await query<{ id: string }>(
    `INSERT INTO busquedas (origen, destino, fecha_salida, fecha_regreso, adultos, menores, bebes,
                            cabina, duffel_offer_request_id, ofertas_encontradas, origen_solicitud)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id::text`,
    [
      origenBusqueda,
      destinoBusqueda,
      fechaBusqueda,
      multiciudad ? null : (p.fechaRegreso ?? null),
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

  /** Para armar el viaje eligiendo ida y regreso por separado se usan todas las ofertas. */
  const porTramo = armarOpcionesPorTramo(ofertas);

  return NextResponse.json({
    busquedaId: busqueda.id,
    solicitudId: solicitud.id,
    total: ofertas.length,
    tramosBuscados: multiciudad ? multiciudad.length : p.fechaRegreso ? 2 : 1,
    opcionesTramo: porTramo.opciones,
    combinaciones: porTramo.combinaciones,
    aerolineasCombinaciones: porTramo.aerolineas,
    moneda: ofertas[0]?.oferta.total_currency ?? "USD",
    ofertas: mostradas.map(({ oferta, precio }) => ({
      ...normalizarOferta(oferta, precio),
      cotizacionId: porOferta.get(oferta.id) ?? null,
    })),
  });
}
