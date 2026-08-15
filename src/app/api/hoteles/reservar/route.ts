import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { esAmbientePruebaHoteles, preReservarHotel, reservarHotel } from "@/lib/liteapi";
import { verificarCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";
export const maxDuration = 60;

const esquema = z.object({
  ofertaId: z.string().trim().min(5),
  nombre: z.string().trim().min(2),
  apellido: z.string().trim().min(2),
  correo: z.string().trim().email(),
  telefono: z.string().trim().optional(),
  metodoPago: z.enum(["ACC_CREDIT_CARD", "WALLET"]).default("ACC_CREDIT_CARD"),
  captchaId: z.string().trim().min(1),
  captchaRespuesta: z.string().trim().min(1),
});

interface Cotizacion {
  id: string;
  costo_neto: string;
  markup: string;
  precio_venta: string;
  moneda: string;
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

  const captchaOk = await verificarCaptcha(p.captchaId, p.captchaRespuesta);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Respuesta de verificación anti-bots incorrecta" },
      { status: 403 },
    );
  }

  const [cotizacion] = await query<Cotizacion & Record<string, unknown>>(
    `SELECT id::text, costo_neto::text, markup::text, precio_venta::text, moneda
       FROM hoteles_cotizaciones
      WHERE liteapi_offer_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [p.ofertaId],
  );
  if (!cotizacion) {
    return NextResponse.json(
      { error: "La oferta no está en la base; vuelve a buscar el hotel" },
      { status: 404 },
    );
  }

  let pre;
  try {
    pre = await preReservarHotel(p.ofertaId);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  let reserva;
  try {
    reserva = await reservarHotel({
      prebookId: pre.data.prebookId,
      huesped: {
        nombre: p.nombre,
        apellido: p.apellido,
        correo: p.correo,
        telefono: p.telefono,
      },
      referencia: `cot${cotizacion.id}-${randomUUID().slice(0, 8)}`,
      metodoPago: p.metodoPago,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  const ambiente = esAmbientePruebaHoteles() ? "sandbox" : "live";
  const costoNeto = pre.data.price ?? Number(cotizacion.costo_neto);
  const markup = Number(cotizacion.markup);

  const [guardada] = await query<{ id: string }>(
    `INSERT INTO hoteles_reservas
       (cotizacion_id, liteapi_booking_id, confirmacion_hotel, estado, ambiente, moneda,
        costo_neto, markup, precio_venta, huesped_nombre, huesped_correo, respuesta)
     VALUES ($1::bigint,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
     RETURNING id::text`,
    [
      cotizacion.id,
      reserva.data.bookingId,
      reserva.data.hotelConfirmationCode ?? null,
      reserva.data.status,
      ambiente,
      reserva.data.currency ?? cotizacion.moneda,
      costoNeto,
      markup,
      costoNeto + markup,
      `${p.nombre} ${p.apellido}`,
      p.correo,
      JSON.stringify(reserva.data),
    ],
  );

  return NextResponse.json({
    reservaId: guardada.id,
    bookingId: reserva.data.bookingId,
    confirmacionHotel: reserva.data.hotelConfirmationCode ?? null,
    estado: reserva.data.status,
    ambiente,
    moneda: reserva.data.currency ?? cotizacion.moneda,
    costoNeto,
    markup,
    precioVenta: costoNeto + markup,
  });
}
