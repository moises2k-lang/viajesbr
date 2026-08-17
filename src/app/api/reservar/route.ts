import { NextResponse } from "next/server";
import { z } from "zod";
import { esAmbientePrueba } from "@/lib/duffel";
import { crearOrden, obtenerOferta } from "@/lib/providers";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { query } from "@/lib/db";
import { verificarCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";
export const maxDuration = 60;

const pasajero = z.object({
  titulo: z.enum(["mr", "ms", "mrs", "miss", "dr"]).nullish(),
  nombre: z.string().trim().min(1),
  apellido: z.string().trim().min(1),
  fechaNacimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  genero: z.enum(["m", "f"]).nullish(),
});

const esquema = z.object({
  ofertaId: z.string().trim().min(3),
  email: z.string().email(),
  telefono: z.string().trim().min(8),
  pasajeros: z.array(pasajero).min(1).max(9),
  captchaId: z.string().trim().min(1),
  captchaRespuesta: z.string().trim().min(1),
});

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
      { error: "Datos de pasajeros inválidos", detalle: validado.error.issues },
      { status: 400 },
    );
  }
  const datos = validado.data;

  const captchaOk = await verificarCaptcha(datos.captchaId, datos.captchaRespuesta);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Respuesta de verificación anti-bots incorrecta" },
      { status: 403 },
    );
  }

  let oferta;
  try {
    oferta = await obtenerOferta(datos.ofertaId);
  } catch (error) {
    return NextResponse.json(
      { error: `La oferta ya no está disponible: ${(error as Error).message}` },
      { status: 409 },
    );
  }

  if (oferta.passengers.length !== datos.pasajeros.length) {
    return NextResponse.json(
      {
        error: `La oferta requiere ${oferta.passengers.length} pasajeros y recibí ${datos.pasajeros.length}`,
      },
      { status: 400 },
    );
  }

  const reglas = await reglasActivas();
  const precio = calcularPrecio(
    Number(oferta.total_amount),
    {
      aerolineaIata: oferta.owner.iata_code,
      origen: oferta.slices[0].origin.iata_code,
      destino: oferta.slices[0].destination.iata_code,
      moneda: oferta.total_currency,
    },
    reglas,
  );

  let orden;
  try {
    orden = await crearOrden({
      offerId: oferta.id,
      moneda: oferta.total_currency,
      monto: oferta.total_amount,
      pasajeros: oferta.passengers.map((p, indice) => {
        const entrada = datos.pasajeros[indice];
        return {
          id: p.id,
          ...(entrada.titulo ? { title: entrada.titulo } : {}),
          given_name: entrada.nombre,
          family_name: entrada.apellido,
          born_on: entrada.fechaNacimiento,
          ...(entrada.genero ? { gender: entrada.genero } : {}),
          email: datos.email,
          phone_number: datos.telefono,
        };
      }),
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }

  const [cotizacion] = await query<{ id: string }>(
    `SELECT id::text FROM cotizaciones WHERE duffel_offer_id = $1 ORDER BY id DESC LIMIT 1`,
    [oferta.id],
  );

  const [registro] = await query<{ id: string }>(
    `INSERT INTO ordenes (cotizacion_id, duffel_order_id, pnr, estado, ambiente, moneda,
                          costo_neto, markup, precio_venta, contacto_email, contacto_telefono, respuesta)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING id::text`,
    [
      cotizacion?.id ?? null,
      orden.id,
      orden.booking_reference,
      "confirmada",
      orden.live_mode ? "produccion" : "sandbox",
      orden.total_currency,
      precio.costoNeto,
      precio.markup,
      precio.precioVenta,
      datos.email,
      datos.telefono,
      JSON.stringify(orden),
    ],
  );

  for (const [indice, p] of oferta.passengers.entries()) {
    const entrada = datos.pasajeros[indice];
    await query(
      `INSERT INTO pasajeros (orden_id, duffel_passenger_id, tipo, titulo, nombre, apellido,
                              fecha_nacimiento, genero, email, telefono)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        registro.id,
        p.id,
        p.type ?? (typeof p.age === "number" ? `edad_${p.age}` : "adult"),
        entrada.titulo ?? null,
        entrada.nombre,
        entrada.apellido,
        entrada.fechaNacimiento,
        entrada.genero ?? null,
        datos.email,
        datos.telefono,
      ],
    );
  }

  return NextResponse.json({
    ordenId: registro.id,
    duffelOrderId: orden.id,
    pnr: orden.booking_reference,
    ambiente: esAmbientePrueba() ? "sandbox" : "produccion",
    moneda: orden.total_currency,
    costoNeto: precio.costoNeto,
    markup: precio.markup,
    precioVenta: precio.precioVenta,
  });
}
