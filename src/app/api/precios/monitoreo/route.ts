import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { usuarioDeSesion } from "@/lib/auth";
import { verificarCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";

function validarIata(v: unknown): string | null {
  if (typeof v !== "string" || !/^[a-zA-Z]{3}$/.test(v.trim())) return null;
  return v.trim().toUpperCase();
}

function validarFecha(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}

export async function POST(request: NextRequest) {
  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const usuario = await usuarioDeSesion();
  const captchaId = typeof cuerpo.captchaId === "string" ? cuerpo.captchaId : "";
  const captchaRespuesta = typeof cuerpo.captchaRespuesta === "string" ? cuerpo.captchaRespuesta : "";
  const captchaOk = usuario || (await verificarCaptcha(captchaId, captchaRespuesta));
  if (!captchaOk) {
    return NextResponse.json({ error: "Verificación anti-bots incorrecta" }, { status: 403 });
  }

  const origen = validarIata(cuerpo.origen);
  const destino = validarIata(cuerpo.destino);
  const fechaSalida = validarFecha(cuerpo.fechaSalida);
  const fechaRegreso = validarFecha(cuerpo.fechaRegreso);
  const adultos = typeof cuerpo.adultos === "number" ? cuerpo.adultos : Number(cuerpo.adultos || 1);
  const email = typeof cuerpo.email === "string" && cuerpo.email.includes("@") ? cuerpo.email.trim() : null;

  if (!origen || !destino || !fechaSalida || !email) {
    return NextResponse.json({ error: "Faltan origen, destino, fechaSalida o email" }, { status: 400 });
  }

  const menores = Array.isArray(cuerpo.menores) ? cuerpo.menores.filter((x) => typeof x === "number") : [];
  const bebes = typeof cuerpo.bebes === "number" ? cuerpo.bebes : Number(cuerpo.bebes || 0);
  const cabina = typeof cuerpo.cabina === "string" ? cuerpo.cabina.trim() || null : null;
  const frecuenciaHoras = typeof cuerpo.frecuenciaHoras === "number" ? cuerpo.frecuenciaHoras : 6;
  const respetarShabbat = cuerpo.respetarShabbat !== false;
  const datos = typeof cuerpo.datos === "object" && cuerpo.datos !== null ? cuerpo.datos : { edades_menores: menores, edades_bebes: [] };

  const [fila] = await query<{ id: string }>(
    `INSERT INTO monitoreo_precios
       (usuario_id, origen, destino, fecha_salida, fecha_regreso, adultos, menores, bebes,
        cabina, respetar_shabbat, email, frecuencia_horas, proxima_ejecucion, datos)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now(), $13::jsonb)
     RETURNING id::text`,
    [
      usuario?.id ?? null,
      origen,
      destino,
      fechaSalida,
      fechaRegreso || null,
      adultos,
      menores.length,
      bebes,
      cabina,
      respetarShabbat,
      email,
      frecuenciaHoras,
      JSON.stringify(datos),
    ],
  );

  return NextResponse.json({ id: fila.id, mensaje: "Monitoreo creado. El rastreador empezará a consultar precios." }, { status: 201 });
}
