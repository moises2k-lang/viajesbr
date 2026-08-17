import {
  buscarOfertas as buscarOfertasDuffel,
  obtenerOferta as obtenerOfertaDuffel,
  crearOrden as crearOrdenDuffel,
  sugerirLugares as sugerirLugaresDuffel,
  aeropuertosDelPais as aeropuertosDelPaisDuffel,
  type ParametrosBusqueda,
  type SolicitudOfertas,
  type Oferta,
  type Orden,
  type PasajeroOrden,
  type LugarSugerido,
  type AeropuertoSugerido,
} from "@/lib/duffel";
import {
  buscarOfertas as buscarOfertasSabre,
  esSabreActivo,
} from "@/lib/sabre";
import {
  sugerirLugaresSabre,
  aeropuertosDelPaisSabre,
} from "@/lib/sabre-lugares";

export type {
  ParametrosBusqueda,
  SolicitudOfertas,
  Oferta,
  Orden,
  PasajeroOrden,
  LugarSugerido,
  AeropuertoSugerido,
} from "@/lib/duffel";

const provider = (process.env.FLIGHT_PROVIDER ?? "duffel").toLowerCase();

export function proveedorActivo(): "duffel" | "sabre" {
  if (provider === "sabre" && esSabreActivo()) return "sabre";
  return "duffel";
}

export async function buscarOfertas(
  p: ParametrosBusqueda,
): Promise<SolicitudOfertas> {
  if (proveedorActivo() === "sabre") {
    return buscarOfertasSabre(p);
  }
  return buscarOfertasDuffel(p);
}

export async function obtenerOferta(offerId: string): Promise<Oferta> {
  if (proveedorActivo() === "sabre") {
    throw new Error(
      "La revalidación de ofertas de Sabre requiere FlightCheck; aún no está implementada.",
    );
  }
  return obtenerOfertaDuffel(offerId);
}

export async function crearOrden(args: {
  offerId: string;
  pasajeros: PasajeroOrden[];
  moneda: string;
  monto: string;
}): Promise<Orden> {
  if (proveedorActivo() === "sabre") {
    throw new Error(
      "La reserva con Sabre requiere PNR/ticketing; aún no está implementada.",
    );
  }
  return crearOrdenDuffel(args);
}

export async function sugerirLugares(consulta: string): Promise<LugarSugerido[]> {
  if (proveedorActivo() === "sabre") {
    return sugerirLugaresSabre(consulta);
  }
  return sugerirLugaresDuffel(consulta);
}

export async function aeropuertosDelPais(
  codigoPais: string,
): Promise<AeropuertoSugerido[]> {
  if (proveedorActivo() === "sabre") {
    return aeropuertosDelPaisSabre(codigoPais);
  }
  return aeropuertosDelPaisDuffel(codigoPais);
}
