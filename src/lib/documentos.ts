import { query } from "@/lib/db";
import type { RebanadaOferta } from "@/lib/duffel";

export interface RespuestaOrdenDuffel {
  id: string;
  booking_reference: string;
  total_amount: string;
  total_currency: string;
  live_mode: boolean;
  slices: RebanadaOferta[];
  conditions?: {
    change_before_departure?: { allowed: boolean; penalty_amount?: string | null } | null;
    refund_before_departure?: { allowed: boolean; penalty_amount?: string | null } | null;
  } | null;
}

export interface OrdenDocumento extends Record<string, unknown> {
  id: string;
  creado_en: string;
  duffel_order_id: string;
  pnr: string | null;
  estado: string;
  ambiente: string;
  moneda: string;
  costo_neto: string;
  markup: string;
  precio_venta: string;
  contacto_email: string | null;
  contacto_telefono: string | null;
  respuesta: RespuestaOrdenDuffel;
}

export interface PasajeroDocumento extends Record<string, unknown> {
  tipo: string;
  titulo: string | null;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  genero: string | null;
}

export interface ItinerarioDocumento extends Record<string, unknown> {
  id: string;
  creado_en: string;
  titulo: string;
  cliente: string;
  resumen: string | null;
  moneda: string;
  estado: string;
}

export interface BloqueDocumento extends Record<string, unknown> {
  id: string;
  posicion: number;
  tipo: string;
  titulo: string;
  fecha: string | null;
  fecha_fin: string | null;
  detalle: string | null;
  proveedor: string | null;
  costo_neto: string | null;
  precio_venta: string | null;
}

export async function ordenParaDocumento(id: string) {
  const [orden] = await query<OrdenDocumento>(
    `SELECT id::text, creado_en, duffel_order_id, pnr, estado, ambiente, moneda,
            costo_neto::text, markup::text, precio_venta::text,
            contacto_email, contacto_telefono, respuesta
       FROM ordenes WHERE id = $1`,
    [id],
  );
  if (!orden) {
    return null;
  }
  const pasajeros = await query<PasajeroDocumento>(
    `SELECT tipo, titulo, nombre, apellido, fecha_nacimiento::text, genero
       FROM pasajeros WHERE orden_id = $1 ORDER BY id`,
    [id],
  );
  return { orden, pasajeros };
}

export async function itinerarioParaDocumento(id: string) {
  const [itinerario] = await query<ItinerarioDocumento>(
    `SELECT id::text, creado_en, titulo, cliente, resumen, moneda, estado
       FROM itinerarios WHERE id = $1`,
    [id],
  );
  if (!itinerario) {
    return null;
  }
  const bloques = await query<BloqueDocumento>(
    `SELECT id::text, posicion, tipo, titulo, fecha::text, fecha_fin::text,
            detalle, proveedor, costo_neto::text, precio_venta::text
       FROM itinerario_bloques
      WHERE itinerario_id = $1
      ORDER BY fecha NULLS LAST,
               CASE tipo WHEN 'vuelo' THEN 0 WHEN 'traslado' THEN 1 WHEN 'hotel' THEN 2 ELSE 3 END,
               posicion, id`,
    [id],
  );
  return { itinerario, bloques };
}
