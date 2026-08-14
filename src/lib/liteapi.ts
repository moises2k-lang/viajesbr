const LITEAPI_URL = "https://api.liteapi.travel/v3.0";

function llave(): string {
  const k = process.env.LITEAPI_API_KEY;
  if (!k) throw new Error("Falta la variable LITEAPI_API_KEY");
  return k;
}

/** Las llaves sandbox de liteAPI empiezan con sand_. */
export function esAmbientePruebaHoteles(): boolean {
  return (process.env.LITEAPI_API_KEY || "").startsWith("sand_");
}

interface ErrorLiteApi {
  error?: { code?: number; message?: string };
}

async function llamar<T>(ruta: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(`${LITEAPI_URL}${ruta}`, {
    ...init,
    headers: {
      "X-API-Key": llave(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });

  const texto = await respuesta.text();
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    throw new Error(`liteAPI ${respuesta.status}: ${texto.slice(0, 300)}`);
  }

  const error = (cuerpo as ErrorLiteApi).error;
  if (!respuesta.ok || error) {
    throw new Error(
      `liteAPI ${respuesta.status}: ${error?.message ?? texto.slice(0, 300)}${
        error?.code ? ` (código ${error.code})` : ""
      }`,
    );
  }
  return cuerpo as T;
}

export interface HotelLiteApi {
  id: string;
  name: string;
  address?: string;
  city_name?: string;
  country_code?: string;
  stars?: number;
  rating?: number;
  reviewCount?: number;
  main_photo?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
}

export interface TarifaLiteApi {
  rateId: string;
  name: string;
  boardName?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  cancellationPolicies?: {
    refundableTag?: string;
    cancelPolicyInfos?: {
      cancelTime?: string;
      amount?: number;
      currency?: string;
    }[];
  };
  retailRate?: {
    total?: { amount: number; currency: string }[];
    suggestedSellingPrice?: {
      amount: number;
      currency: string;
      source?: string;
    }[];
    taxesAndFees?: {
      included: boolean;
      description: string;
      amount: number;
      currency: string;
    }[];
  };
}

export interface TipoHabitacionLiteApi {
  roomTypeId: string;
  offerId: string;
  supplier?: string;
  rates: TarifaLiteApi[];
  offerRetailRate?: { amount: number; currency: string };
  suggestedSellingPrice?: { amount: number; currency: string; source?: string };
}

export interface RespuestaTarifas {
  sandbox?: boolean;
  hotels?: HotelLiteApi[];
  data: { hotelId: string; roomTypes: TipoHabitacionLiteApi[] }[];
}

export interface LugarLiteApi {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  types?: string[];
}

/** Autocompletado de destinos de liteAPI; el placeId sirve directo para buscar tarifas. */
export async function sugerirCiudades(
  consulta: string,
): Promise<LugarLiteApi[]> {
  const cuerpo = await llamar<{ data: LugarLiteApi[] }>(
    `/data/places?textQuery=${encodeURIComponent(consulta)}&language=es`,
  );
  return cuerpo.data ?? [];
}

export interface ParametrosHoteles {
  placeId: string;
  entrada: string;
  salida: string;
  adultos: number;
  menores: number[];
  moneda: string;
  nacionalidad: string;
  limite: number;
}

export async function buscarHoteles(
  p: ParametrosHoteles,
): Promise<RespuestaTarifas> {
  return llamar<RespuestaTarifas>("/hotels/rates", {
    method: "POST",
    body: JSON.stringify({
      checkin: p.entrada,
      checkout: p.salida,
      currency: p.moneda,
      guestNationality: p.nacionalidad,
      occupancies: [
        {
          adults: p.adultos,
          ...(p.menores.length > 0 ? { children: p.menores } : {}),
        },
      ],
      placeId: p.placeId,
      limit: p.limite,
      hotelInfo: true,
    }),
  });
}

export interface PreReserva {
  data: {
    prebookId: string;
    offerId: string;
    hotelId?: string;
    price: number;
    currency: string;
    cancellationPolicies?: TarifaLiteApi["cancellationPolicies"];
    priceDifference?: number;
  };
}

/** Segundo paso de liteAPI: confirma precio y disponibilidad antes de reservar. */
export async function preReservarHotel(offerId: string): Promise<PreReserva> {
  return llamar<PreReserva>("/rates/prebook", {
    method: "POST",
    body: JSON.stringify({ offerId, usePaymentSdk: false }),
  });
}

export interface HuespedHotel {
  nombre: string;
  apellido: string;
  correo: string;
  telefono?: string;
}

export interface ReservaHotel {
  data: {
    bookingId: string;
    clientReference?: string;
    supplierBookingId?: string;
    status: string;
    hotelConfirmationCode?: string;
    checkin?: string;
    checkout?: string;
    hotel?: { hotelId?: string; name?: string };
    price?: number;
    currency?: string;
  };
}

/** liteAPI cobra la reserva al crédito de la cuenta (ACC_CREDIT_CARD) o al wallet. */
export type MetodoPagoHotel = "ACC_CREDIT_CARD" | "WALLET";

export async function reservarHotel(args: {
  prebookId: string;
  huesped: HuespedHotel;
  referencia: string;
  metodoPago: MetodoPagoHotel;
}): Promise<ReservaHotel> {
  return llamar<ReservaHotel>("/rates/book", {
    method: "POST",
    body: JSON.stringify({
      prebookId: args.prebookId,
      holder: {
        firstName: args.huesped.nombre,
        lastName: args.huesped.apellido,
        email: args.huesped.correo,
        ...(args.huesped.telefono ? { phone: args.huesped.telefono } : {}),
      },
      guests: [
        {
          occupancyNumber: 1,
          firstName: args.huesped.nombre,
          lastName: args.huesped.apellido,
          email: args.huesped.correo,
          remarks: "",
        },
      ],
      payment: { method: args.metodoPago },
      clientReference: args.referencia,
    }),
  });
}

export interface FotoHabitacionLiteApi {
  url: string;
  hd_url?: string;
  imageDescription?: string;
  mainPhoto?: boolean;
}

export interface HabitacionCatalogoLiteApi {
  id: number;
  roomName: string;
  description?: string;
  roomSizeSquare?: number;
  roomSizeUnit?: string;
  maxOccupancy?: number;
  maxAdults?: number;
  maxChildren?: number;
  bedTypes?: { quantity?: number; bedType?: string; bedSize?: string }[];
  roomAmenities?: { name: string }[];
  photos?: FotoHabitacionLiteApi[];
}

export interface DetalleHotelLiteApi {
  id: string;
  name: string;
  hotelDescription?: string;
  hotelImportantInformation?: string;
  checkinCheckoutTimes?: {
    checkin_start?: string;
    checkin_end?: string;
    checkout?: string;
  };
  hotelImages?: {
    url: string;
    urlHd?: string;
    caption?: string;
    defaultImage?: boolean;
  }[];
  main_photo?: string;
  country?: string;
  city?: string;
  starRating?: number;
  location?: { latitude?: number; longitude?: number };
  address?: string;
  zip?: string;
  chain?: string;
  hotelFacilities?: string[];
  rooms?: HabitacionCatalogoLiteApi[];
  phone?: string;
  hotelType?: string;
  rating?: number;
  reviewCount?: number;
  parking?: string;
  childAllowed?: boolean;
  petsAllowed?: boolean;
  sentiment_analysis?: {
    pros?: string[];
    cons?: string[];
    categories?: { name: string; rating: number; description?: string }[];
  };
}

/** Ficha completa del hotel: fotos, servicios, habitaciones del catálogo y ubicación. */
export async function detalleHotel(
  hotelId: string,
): Promise<DetalleHotelLiteApi> {
  const cuerpo = await llamar<{ data: DetalleHotelLiteApi }>(
    `/data/hotel?hotelId=${encodeURIComponent(hotelId)}`,
  );
  return cuerpo.data;
}

export interface ResenaLiteApi {
  averageScore?: number;
  country?: string;
  type?: string;
  name?: string;
  date?: string;
  headline?: string;
  pros?: string;
  cons?: string;
}

export async function resenasHotel(
  hotelId: string,
  limite = 8,
): Promise<ResenaLiteApi[]> {
  const cuerpo = await llamar<{ data: ResenaLiteApi[] }>(
    `/data/reviews?hotelId=${encodeURIComponent(hotelId)}&limit=${limite}&timeout=5`,
  );
  return cuerpo.data ?? [];
}
