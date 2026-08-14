import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import {
  buscarHoteles,
  esAmbientePruebaHoteles,
  type HotelLiteApi,
  type TarifaLiteApi,
} from "@/lib/liteapi";
import { calcularPrecio, reglasActivas } from "@/lib/markup";
import { bandera, nombrePais } from "@/lib/paises";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAXIMO_HOTELES = 150;
const MAXIMO_TARIFAS_POR_HOTEL = 25;

const esquema = z.object({
  placeId: z.string().trim().min(5),
  destino: z.string().trim().min(2),
  pais: z.string().trim().length(2).nullable().default(null),
  entrada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  salida: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adultos: z.number().int().min(1).max(9),
  menores: z.array(z.number().int().min(0).max(17)).max(8),
  moneda: z.string().trim().length(3).default("USD"),
  nacionalidad: z.string().trim().length(2).default("MX"),
});

export interface HabitacionConPrecio {
  ofertaId: string;
  cotizacionId?: string | null;
  habitacion: string;
  regimen: string | null;
  reembolsable: boolean | null;
  cancelaAntesDe: string | null;
  costoNeto: number;
  markup: number;
  precioVenta: number;
  precioReferencia: number | null;
  fuenteReferencia: string | null;
  impuestosNoIncluidos: { descripcion: string; monto: number }[];
}

export interface HotelConPrecio {
  hotelId: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  bandera: string | null;
  estrellas: number | null;
  calificacion: number | null;
  resenas: number | null;
  foto: string | null;
  latitud: number | null;
  longitud: number | null;
  noches: number;
  moneda: string;
  desde: number;
  habitaciones: HabitacionConPrecio[];
}

function noches(entrada: string, salida: string): number {
  const dia = 24 * 60 * 60 * 1000;
  return Math.max(
    1,
    Math.round((new Date(`${salida}T00:00:00Z`).getTime() - new Date(`${entrada}T00:00:00Z`).getTime()) / dia),
  );
}

function totalTarifa(tarifa: TarifaLiteApi): { monto: number; moneda: string } | null {
  const total = tarifa.retailRate?.total?.[0];
  return total ? { monto: total.amount, moneda: total.currency } : null;
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
  if (p.salida <= p.entrada) {
    return NextResponse.json(
      { error: "La fecha de salida debe ser posterior a la de entrada" },
      { status: 400 },
    );
  }

  let respuesta;
  try {
    respuesta = await buscarHoteles({
      placeId: p.placeId,
      entrada: p.entrada,
      salida: p.salida,
      adultos: p.adultos,
      menores: p.menores,
      moneda: p.moneda.toUpperCase(),
      nacionalidad: p.nacionalidad.toUpperCase(),
      limite: MAXIMO_HOTELES,
    });
  } catch (error) {
    const mensaje = (error as Error).message;
    if (/no availability found/i.test(mensaje) || /código 2001/i.test(mensaje)) {
      return NextResponse.json({
        busquedaId: null,
        ambiente: esAmbientePruebaHoteles() ? "sandbox" : "live",
        noches: noches(p.entrada, p.salida),
        total: 0,
        hoteles: [],
        mensaje:
          "No encontramos hoteles disponibles para esas fechas. Prueba con otras fechas o destino.",
      });
    }
    return NextResponse.json({ error: mensaje }, { status: 502 });
  }

  const reglas = await reglasActivas();
  const porId = new Map<string, HotelLiteApi>();
  for (const hotel of respuesta.hotels ?? []) porId.set(hotel.id, hotel);

  const totalNoches = noches(p.entrada, p.salida);
  const hoteles: HotelConPrecio[] = [];

  for (const fila of respuesta.data) {
    const info = porId.get(fila.hotelId);
    const habitaciones: HabitacionConPrecio[] = [];
    let moneda = p.moneda.toUpperCase();

    for (const tipo of fila.roomTypes) {
      const tarifa = tipo.rates[0];
      if (!tarifa) continue;
      const total = totalTarifa(tarifa);
      if (!total) continue;
      moneda = total.moneda;
      const precio = calcularPrecio(
        total.monto,
        {
          aerolineaIata: "",
          origen: "",
          destino: p.destino.toUpperCase(),
          moneda: total.moneda,
        },
        reglas,
      );
      const politica = tarifa.cancellationPolicies;
      habitaciones.push({
        ofertaId: tipo.offerId,
        habitacion: tarifa.name,
        regimen: tarifa.boardName ?? null,
        reembolsable: politica?.refundableTag ? politica.refundableTag === "RFN" : null,
        cancelaAntesDe: politica?.cancelPolicyInfos?.[0]?.cancelTime ?? null,
        costoNeto: precio.costoNeto,
        markup: precio.markup,
        precioVenta: precio.precioVenta,
        precioReferencia: tarifa.retailRate?.suggestedSellingPrice?.[0]?.amount ?? null,
        fuenteReferencia: tarifa.retailRate?.suggestedSellingPrice?.[0]?.source ?? null,
        impuestosNoIncluidos: (tarifa.retailRate?.taxesAndFees ?? [])
          .filter((t) => !t.included)
          .map((t) => ({ descripcion: t.description, monto: t.amount })),
      });
    }

    if (habitaciones.length === 0) continue;
    habitaciones.sort((a, b) => a.precioVenta - b.precioVenta);
    habitaciones.splice(MAXIMO_TARIFAS_POR_HOTEL);
    const paisHotel = info?.country_code?.toUpperCase() ?? p.pais?.toUpperCase() ?? null;

    hoteles.push({
      hotelId: fila.hotelId,
      nombre: info?.name ?? fila.hotelId,
      direccion: info?.address ?? null,
      ciudad: info?.city_name ?? null,
      pais: paisHotel ? nombrePais(paisHotel) : null,
      bandera: paisHotel ? bandera(paisHotel) : null,
      estrellas: info?.stars ?? null,
      calificacion: info?.rating ?? null,
      resenas: info?.reviewCount ?? null,
      foto: info?.main_photo ?? info?.thumbnail ?? null,
      latitud: info?.latitude ?? null,
      longitud: info?.longitude ?? null,
      noches: totalNoches,
      moneda,
      desde: habitaciones[0].precioVenta,
      habitaciones,
    });
  }

  hoteles.sort((a, b) => a.desde - b.desde);
  const ambiente = esAmbientePruebaHoteles() ? "sandbox" : "live";

  if (hoteles.length === 0 && ambiente === "sandbox") {
    const paisHotel = p.pais?.toUpperCase() ?? "MX";
    const ciudad = p.destino;
    const precios = [120, 185, 245];
    for (let i = 0; i < precios.length; i += 1) {
      const costo = precios[i];
      const precio = calcularPrecio(
        costo,
        {
          aerolineaIata: "",
          origen: "",
          destino: p.destino.toUpperCase(),
          moneda: p.moneda.toUpperCase(),
        },
        reglas,
      );
      const ofertaId = `demo-${paisHotel.toLowerCase()}-${Date.now()}-${i}`;
      const habitacion: HabitacionConPrecio = {
        ofertaId,
        habitacion: "Habitación estándar - Solo hospedaje",
        regimen: "RO",
        reembolsable: false,
        cancelaAntesDe: null,
        costoNeto: precio.costoNeto,
        markup: precio.markup,
        precioVenta: precio.precioVenta,
        precioReferencia: costo,
        fuenteReferencia: "sandbox",
        impuestosNoIncluidos: [],
      };
      const nombre = i === 0
        ? `Hotel Demo ${ciudad} - Zona Centro`
        : i === 1
          ? `Hotel Demo ${ciudad} - Zona Hotelera`
          : `Hotel Demo ${ciudad} - Ejecutivo`;
      hoteles.push({
        hotelId: `demo-${paisHotel.toLowerCase()}-${i}`,
        nombre,
        direccion: `Calle demo, ${ciudad}`,
        ciudad,
        pais: paisHotel ? nombrePais(paisHotel) : null,
        bandera: paisHotel ? bandera(paisHotel) : null,
        estrellas: 3 + i,
        calificacion: 7.5 + i * 0.4,
        resenas: 42 + i * 30,
        foto: null,
        latitud: null,
        longitud: null,
        noches: totalNoches,
        moneda: p.moneda.toUpperCase(),
        desde: habitacion.precioVenta,
        habitaciones: [habitacion],
      });
    }
  }

  const [busqueda] = await query<{ id: string }>(
    `INSERT INTO hoteles_busquedas (ciudad, pais, place_id, entrada, salida, adultos, menores,
                                    moneda, hoteles_encontrados, ambiente)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id::text`,
    [
      p.destino,
      p.pais?.toUpperCase() ?? null,
      p.placeId,
      p.entrada,
      p.salida,
      p.adultos,
      p.menores.length,
      p.moneda.toUpperCase(),
      hoteles.length,
      ambiente,
    ],
  );

  const valores: unknown[] = [];
  const filas: string[] = [];
  for (const hotel of hoteles) {
    for (const habitacion of hotel.habitaciones) {
      const base = valores.length;
      valores.push(
        busqueda.id,
        hotel.hotelId,
        habitacion.ofertaId,
        hotel.nombre,
        habitacion.habitacion,
        habitacion.regimen,
        hotel.moneda,
        habitacion.costoNeto,
        habitacion.markup,
        habitacion.precioVenta,
        habitacion.reembolsable,
        JSON.stringify({ hotel: hotel.hotelId, habitacion }),
      );
      filas.push(
        `($${base + 1}::bigint,$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},` +
          `$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},$${base + 12}::jsonb)`,
      );
    }
  }

  if (filas.length > 0) {
    const guardadas = await query<{ id: string; liteapi_offer_id: string }>(
      `INSERT INTO hoteles_cotizaciones
         (busqueda_id, liteapi_hotel_id, liteapi_offer_id, hotel_nombre, habitacion, regimen,
          moneda, costo_neto, markup, precio_venta, reembolsable, datos)
       VALUES ${filas.join(",")}
       RETURNING id::text, liteapi_offer_id`,
      valores,
    );
    const porOferta = new Map(guardadas.map((c) => [c.liteapi_offer_id, c.id]));
    for (const hotel of hoteles) {
      for (const habitacion of hotel.habitaciones) {
        habitacion.cotizacionId = porOferta.get(habitacion.ofertaId) ?? null;
      }
    }
  }

  return NextResponse.json({
    busquedaId: busqueda.id,
    ambiente,
    noches: totalNoches,
    total: hoteles.length,
    hoteles,
  });
}
