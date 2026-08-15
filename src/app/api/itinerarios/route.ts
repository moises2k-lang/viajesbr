import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { usuarioDeSesion } from "@/lib/auth";
import { verificarCaptcha } from "@/lib/captcha";

interface BloqueCuerpo {
  posicion?: unknown;
  tipo?: unknown;
  titulo?: unknown;
  fecha?: unknown;
  fecha_fin?: unknown;
  detalle?: unknown;
  proveedor?: unknown;
  costo_neto?: unknown;
  precio_venta?: unknown;
  cotizacion_id?: unknown;
  datos?: unknown;
}

interface Cuerpo {
  titulo?: unknown;
  cliente?: unknown;
  resumen?: unknown;
  moneda?: unknown;
  estado?: unknown;
  bloques?: unknown;
  captchaId?: unknown;
  captchaRespuesta?: unknown;
}

const ESTADOS = ["borrador", "cotizacion", "confirmado", "cancelado"];

export async function GET() {
  const usuario = await usuarioDeSesion();
  const client = await pool().connect();
  try {
    const itinerarios = await client.query<Record<string, unknown>>(
      `SELECT i.id::text, i.creado_en, i.titulo, i.cliente, i.moneda, i.estado,
              count(b.id)::int AS bloques,
              coalesce(sum(b.precio_venta), 0)::text AS total
         FROM itinerarios i
         LEFT JOIN itinerario_bloques b ON b.itinerario_id = i.id
        ${usuario ? "WHERE i.usuario_id = $1" : ""}
        GROUP BY i.id
        ORDER BY i.creado_en DESC`,
      usuario ? [usuario.id] : [],
    );
    return NextResponse.json({ itinerarios: itinerarios.rows });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const cuerpo = (await request.json()) as Cuerpo;
  const captchaId = typeof cuerpo.captchaId === "string" ? cuerpo.captchaId : "";
  const captchaRespuesta = typeof cuerpo.captchaRespuesta === "string" ? cuerpo.captchaRespuesta : "";
  const captchaOk = await verificarCaptcha(captchaId, captchaRespuesta);
  if (!captchaOk) {
    return NextResponse.json(
      { error: "Respuesta de verificación anti-bots incorrecta" },
      { status: 403 },
    );
  }

  const titulo = typeof cuerpo.titulo === "string" ? cuerpo.titulo.trim() : "";
  const cliente = typeof cuerpo.cliente === "string" ? cuerpo.cliente.trim() : "";
  const moneda = typeof cuerpo.moneda === "string" ? cuerpo.moneda.trim().toUpperCase() : "";

  if (!titulo || !cliente || !/^[A-Z]{3}$/.test(moneda)) {
    return NextResponse.json(
      { error: "Se requieren título, cliente y moneda de tres letras" },
      { status: 400 },
    );
  }

  const estado = typeof cuerpo.estado === "string" && ESTADOS.includes(cuerpo.estado)
    ? cuerpo.estado
    : "borrador";

  const usuario = await usuarioDeSesion();
  const bloquesRaw = Array.isArray(cuerpo.bloques) ? cuerpo.bloques : [];
  const bloques: BloqueCuerpo[] = bloquesRaw.map((b) => (typeof b === "object" && b !== null ? (b as BloqueCuerpo) : {}));

  const client = await pool().connect();
  try {
    await client.query("BEGIN");

    const itinerario = await client.query<{ id: string }>(
      `INSERT INTO itinerarios (titulo, cliente, resumen, moneda, estado, usuario_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id::text`,
      [titulo, cliente, typeof cuerpo.resumen === "string" ? cuerpo.resumen.trim() : null, moneda, estado, usuario?.id ?? null],
    );
    const itinerarioId = itinerario.rows[0].id;

    for (const bloque of bloques) {
      const posicion = typeof bloque.posicion === "number" ? bloque.posicion : 0;
      const tipoB = typeof bloque.tipo === "string" ? bloque.tipo : "";
      const tituloB = typeof bloque.titulo === "string" ? bloque.titulo : "";
      const fecha = typeof bloque.fecha === "string" && bloque.fecha ? bloque.fecha : null;
      const fechaFin = typeof bloque.fecha_fin === "string" && bloque.fecha_fin ? bloque.fecha_fin : null;
      const detalle = typeof bloque.detalle === "string" ? bloque.detalle : null;
      const proveedor = typeof bloque.proveedor === "string" ? bloque.proveedor : null;
      const costoNeto = typeof bloque.costo_neto === "number" ? bloque.costo_neto : null;
      const precioVenta = typeof bloque.precio_venta === "number" ? bloque.precio_venta : null;
      const cotizacionId =
        typeof bloque.cotizacion_id === "number"
          ? bloque.cotizacion_id
          : typeof bloque.cotizacion_id === "string" && bloque.cotizacion_id
            ? parseInt(bloque.cotizacion_id, 10) || null
            : null;
      const datos = bloque.datos ? JSON.stringify(bloque.datos) : null;

      await client.query(
        `INSERT INTO itinerario_bloques
           (itinerario_id, posicion, tipo, titulo, fecha, fecha_fin, detalle, proveedor, costo_neto, precio_venta, cotizacion_id, datos)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [itinerarioId, posicion, tipoB, tituloB, fecha, fechaFin, detalle, proveedor, costoNeto, precioVenta, cotizacionId, datos],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ id: itinerarioId }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    const mensaje = e instanceof Error ? e.message : "Error al guardar itinerario";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  } finally {
    client.release();
  }
}
