import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

function percentil(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const k = (sorted.length - 1) * p;
  const f = Math.floor(k);
  const c = Math.ceil(k);
  if (f === c) return sorted[Math.round(k)];
  return sorted[f] * (c - k) + sorted[c] * (k - f);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origen = searchParams.get("origen")?.toUpperCase();
  const destino = searchParams.get("destino")?.toUpperCase();
  const fechaSalida = searchParams.get("fechaSalida");
  const fechaRegreso = searchParams.get("fechaRegreso");
  const adultos = Number(searchParams.get("adultos") ?? "1");

  if (!origen || !destino || !fechaSalida) {
    return NextResponse.json({ error: "Faltan origen, destino o fechaSalida" }, { status: 400 });
  }

  const [monitoreo] = await query<{
    id: string;
    ultimo_precio: number | null;
    ultima_recomendacion: string | null;
    frecuencia_horas: number;
    proxima_ejecucion: string;
  }>(
    `SELECT id, ultimo_precio, ultima_recomendacion, frecuencia_horas, proxima_ejecucion
       FROM monitoreo_precios
      WHERE activo
        AND origen = $1
        AND destino = $2
        AND fecha_salida = $3
        AND (fecha_regreso IS NOT DISTINCT FROM $4)
        AND adultos = $5
      ORDER BY creado_en DESC
      LIMIT 1`,
    [origen, destino, fechaSalida, fechaRegreso || null, adultos],
  );

  if (!monitoreo) {
    return NextResponse.json({
      monitoreo: false,
      mensaje: "Todavía no hay monitoreo para esta ruta. Guarda una cotización para empezar a rastrear.",
    });
  }

  const historial = await query<{ precio_venta: number; recomendacion: string | null }>(
    `SELECT precio_venta, recomendacion
       FROM historial_precios
      WHERE monitoreo_id = $1
      ORDER BY creado_en DESC`,
    [monitoreo.id],
  );

  const precios = historial.map((h) => Number(h.precio_venta));
  const muestras = precios.length;
  const actual = monitoreo.ultimo_precio ?? precios[0] ?? null;
  let minimo = actual;
  let promedio = actual;
  let p20 = actual;
  let p80 = actual;
  let recomendacion = monitoreo.ultima_recomendacion || "estable";

  if (muestras >= 2) {
    minimo = Math.min(...precios);
    promedio = precios.reduce((a, b) => a + b, 0) / muestras;
    p20 = percentil(precios, 0.2);
    p80 = percentil(precios, 0.8);
  }

  return NextResponse.json({
    monitoreo: true,
    monitoreoId: monitoreo.id,
    recomendacion,
    frecuenciaHoras: monitoreo.frecuencia_horas,
    proximaEjecucion: monitoreo.proxima_ejecucion,
    precioActual: actual,
    muestras,
    minimo,
    promedio,
    percentil20: p20,
    percentil80: p80,
  });
}
