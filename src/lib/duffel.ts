const DUFFEL_URL = "https://api.duffel.com";
const DUFFEL_VERSION = "v2";

export type TipoPasajero = "adult" | "child" | "infant_without_seat";

export interface PasajeroSolicitud {
  type?: TipoPasajero;
  age?: number;
}

export interface LugarOferta {
  iata_code: string;
  name: string;
  city_name?: string;
  iata_country_code?: string;
}

export interface SegmentoOferta {
  id: string;
  origin: LugarOferta;
  destination: LugarOferta;
  departing_at: string;
  arriving_at: string;
  duration?: string;
  marketing_carrier: { iata_code: string; name: string };
  marketing_carrier_flight_number: string;
  operating_carrier?: { iata_code: string; name: string };
  aircraft?: { name: string };
  passengers?: {
    passenger_id: string;
    cabin_class_marketing_name?: string;
    baggages?: { type: string; quantity: number }[];
  }[];
}

export interface RebanadaOferta {
  id: string;
  duration?: string;
  origin: LugarOferta;
  destination: LugarOferta;
  segments: SegmentoOferta[];
  fare_brand_name?: string | null;
}

export interface Oferta {
  id: string;
  total_amount: string;
  total_currency: string;
  tax_amount?: string | null;
  base_amount?: string | null;
  expires_at: string;
  owner: { iata_code: string; name: string; logo_symbol_url?: string | null };
  slices: RebanadaOferta[];
  passengers: { id: string; type?: TipoPasajero; age?: number }[];
  conditions?: {
    change_before_departure?: {
      allowed: boolean;
      penalty_amount?: string | null;
    } | null;
    refund_before_departure?: {
      allowed: boolean;
      penalty_amount?: string | null;
    } | null;
  };
}

export interface SolicitudOfertas {
  id: string;
  offers: Oferta[];
}

export interface PasajeroOrden {
  id: string;
  title?: string;
  given_name: string;
  family_name: string;
  born_on: string;
  gender?: string;
  email?: string;
  phone_number?: string;
}

export interface Orden {
  id: string;
  booking_reference: string;
  total_amount: string;
  total_currency: string;
  live_mode: boolean;
  passengers: { id: string; given_name: string; family_name: string }[];
  slices: RebanadaOferta[];
}

interface RespuestaDuffel<T> {
  data: T;
}

interface ErrorDuffel {
  errors?: { title?: string; message?: string; code?: string }[];
}

function token(): string {
  const t = process.env.DUFFEL_API_TOKEN;
  if (!t) throw new Error("Falta la variable DUFFEL_API_TOKEN");
  return t;
}

export function esAmbientePrueba(): boolean {
  return !(process.env.DUFFEL_API_TOKEN || "").startsWith("duffel_live");
}

async function llamarCrudo<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${DUFFEL_URL}${ruta}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      "Duffel-Version": DUFFEL_VERSION,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });

  const texto = await respuesta.text();
  if (!respuesta.ok) {
    let detalle = texto.slice(0, 500);
    try {
      const cuerpo = JSON.parse(texto) as ErrorDuffel;
      const primero = cuerpo.errors?.[0];
      if (primero)
        detalle = [primero.title, primero.message].filter(Boolean).join(": ");
    } catch {
      // se queda el texto crudo
    }
    throw new Error(`Duffel ${respuesta.status}: ${detalle}`);
  }

  return JSON.parse(texto) as T;
}

async function llamar<T>(ruta: string, init?: RequestInit): Promise<T> {
  return (await llamarCrudo<RespuestaDuffel<T>>(ruta, init)).data;
}

export interface TramoBusqueda {
  origen: string;
  destino: string;
  fecha: string;
}

export interface ParametrosBusqueda {
  origen: string;
  destino: string;
  fechaSalida: string;
  fechaRegreso?: string | null;
  /** Viaje multiciudad: cada tramo con su propio origen, destino y fecha. */
  tramos?: TramoBusqueda[] | null;
  adultos: number;
  menores: number[];
  bebes: number;
  cabina?: string | null;
}

export async function buscarOfertas(
  p: ParametrosBusqueda,
): Promise<SolicitudOfertas> {
  const slices =
    p.tramos && p.tramos.length > 1
      ? p.tramos.map((tramo) => ({
          origin: tramo.origen,
          destination: tramo.destino,
          departure_date: tramo.fecha,
        }))
      : [
          {
            origin: p.origen,
            destination: p.destino,
            departure_date: p.fechaSalida,
          },
        ];
  if (!p.tramos && p.fechaRegreso) {
    slices.push({
      origin: p.destino,
      destination: p.origen,
      departure_date: p.fechaRegreso,
    });
  }

  const passengers: PasajeroSolicitud[] = [];
  for (let i = 0; i < p.adultos; i += 1) passengers.push({ type: "adult" });
  for (const edad of p.menores) passengers.push({ age: edad });
  for (let i = 0; i < p.bebes; i += 1)
    passengers.push({ type: "infant_without_seat" });

  return llamar<SolicitudOfertas>(
    "/air/offer_requests?return_offers=true&supplier_timeout=10000",
    {
      method: "POST",
      body: JSON.stringify({
        data: {
          slices,
          passengers,
          ...(p.cabina ? { cabin_class: p.cabina } : {}),
        },
      }),
    },
  );
}

export interface AeropuertoSugerido {
  id: string;
  name: string;
  iata_code: string | null;
  iata_city_code?: string | null;
  city_name?: string | null;
  iata_country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface LugarSugerido {
  id: string;
  name: string;
  iata_code: string | null;
  iata_city_code?: string | null;
  city_name?: string | null;
  iata_country_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  type: string;
  airports?: AeropuertoSugerido[];
}

interface PaginaAeropuertos {
  data: AeropuertoSugerido[];
  meta: { after?: string | null };
}

/** Aeropuertos de un país con sus coordenadas, tal como los publica Duffel. */
export async function aeropuertosDelPais(
  codigoPais: string,
): Promise<AeropuertoSugerido[]> {
  const aeropuertos: AeropuertoSugerido[] = [];
  let after: string | null = null;
  for (let pagina = 0; pagina < 10; pagina += 1) {
    const ruta: string =
      `/air/airports?iata_country_code=${encodeURIComponent(codigoPais)}&limit=200` +
      (after ? `&after=${encodeURIComponent(after)}` : "");
    const cuerpo: PaginaAeropuertos =
      await llamarCrudo<PaginaAeropuertos>(ruta);
    aeropuertos.push(...cuerpo.data);
    after = cuerpo.meta.after ?? null;
    if (!after) break;
  }
  return aeropuertos;
}

export async function sugerirLugares(
  consulta: string,
): Promise<LugarSugerido[]> {
  return llamar<LugarSugerido[]>(
    `/places/suggestions?query=${encodeURIComponent(consulta)}`,
  );
}

export async function obtenerOferta(offerId: string): Promise<Oferta> {
  return llamar<Oferta>(
    `/air/offers/${offerId}?return_available_services=false`,
  );
}

export async function crearOrden(args: {
  offerId: string;
  pasajeros: PasajeroOrden[];
  moneda: string;
  monto: string;
}): Promise<Orden> {
  return llamar<Orden>("/air/orders", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "instant",
        selected_offers: [args.offerId],
        passengers: args.pasajeros,
        payments: [
          { type: "balance", currency: args.moneda, amount: args.monto },
        ],
      },
    }),
  });
}
