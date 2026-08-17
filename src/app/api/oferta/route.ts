import { NextResponse } from "next/server";
import { z } from "zod";
import { obtenerOferta } from "@/lib/providers";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { normalizarOferta } from "@/lib/ofertas";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

const esquema = z.object({
  ofertaId: z.string().trim().min(3),
  busquedaId: z.string().trim().nullish(),
});

/**
 * Devuelve una oferta concreta con su precio de venta y la guarda como
 * cotización: se usa cuando el viaje se armó eligiendo ida y regreso por
 * separado, porque esa combinación puede no venir entre las tarjetas mostradas.
 */
export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const validado = esquema.safeParse(cuerpo);
  if (!validado.success) {
    return NextResponse.json({ error: "Oferta inválida" }, { status: 400 });
  }

  let oferta;
  try {
    oferta = await obtenerOferta(validado.data.ofertaId);
  } catch (error) {
    return NextResponse.json(
      {
        error: `Esa combinación ya no está disponible: ${(error as Error).message}`,
      },
      { status: 409 },
    );
  }

  const reglas = await reglasActivas();
  const precio = calcularPrecio(
    Number(oferta.total_amount),
    {
      aerolineaIata: oferta.owner.iata_code,
      origen: oferta.slices[0].origin.iata_code,
      destino: oferta.slices[oferta.slices.length - 1].destination.iata_code,
      moneda: oferta.total_currency,
    },
    reglas,
  );

  const [cotizacion] = await query<{ id: string }>(
    `INSERT INTO cotizaciones (busqueda_id, duffel_offer_id, aerolinea, aerolinea_iata, moneda,
                               costo_neto, markup, precio_venta, regla_markup_id, expira_en, itinerario)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING id::text`,
    [
      validado.data.busquedaId ?? null,
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

  return NextResponse.json({
    oferta: {
      ...normalizarOferta(oferta, precio),
      cotizacionId: cotizacion?.id ?? null,
    },
  });
}
