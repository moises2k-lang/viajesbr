import { query } from "@/lib/db";

export interface ReglaMarkup {
  id: string;
  nombre: string;
  activa: boolean;
  prioridad: number;
  aerolinea_iata: string | null;
  origen: string | null;
  destino: string | null;
  moneda: string | null;
  porcentaje: string;
  monto_fijo: string;
  monto_minimo: string;
}

export interface PrecioCalculado {
  costoNeto: number;
  markup: number;
  precioVenta: number;
  reglaId: string | null;
  reglaNombre: string | null;
}

export interface ContextoMarkup {
  aerolineaIata: string;
  origen: string;
  destino: string;
  moneda: string;
}

export async function reglasActivas(): Promise<ReglaMarkup[]> {
  return query<ReglaMarkup & Record<string, unknown>>(
    `SELECT id::text, nombre, activa, prioridad, aerolinea_iata, origen, destino, moneda,
            porcentaje::text, monto_fijo::text, monto_minimo::text
       FROM reglas_markup
      WHERE activa
      ORDER BY prioridad ASC, id ASC`,
  );
}

function coincide(regla: ReglaMarkup, ctx: ContextoMarkup): boolean {
  const igual = (valor: string | null, actual: string) =>
    !valor || valor.toUpperCase() === actual.toUpperCase();
  return (
    igual(regla.aerolinea_iata, ctx.aerolineaIata) &&
    igual(regla.origen, ctx.origen) &&
    igual(regla.destino, ctx.destino) &&
    igual(regla.moneda, ctx.moneda)
  );
}

export function calcularPrecio(
  costoNeto: number,
  ctx: ContextoMarkup,
  reglas: ReglaMarkup[],
): PrecioCalculado {
  const regla = reglas.find((r) => coincide(r, ctx));
  if (!regla) {
    return {
      costoNeto,
      markup: 0,
      precioVenta: costoNeto,
      reglaId: null,
      reglaNombre: null,
    };
  }

  const porPorcentaje = (costoNeto * Number(regla.porcentaje)) / 100;
  const bruto = porPorcentaje + Number(regla.monto_fijo);
  const markup = Math.max(bruto, Number(regla.monto_minimo));
  const redondeado = Math.round(markup * 100) / 100;

  return {
    costoNeto,
    markup: redondeado,
    precioVenta: Math.round((costoNeto + redondeado) * 100) / 100,
    reglaId: regla.id,
    reglaNombre: regla.nombre,
  };
}
