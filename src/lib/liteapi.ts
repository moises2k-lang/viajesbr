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
    cancelPolicyInfos?: { cancelTime?: string; amount?: number; currency?: string }[];
  };
  retailRate?: {
    total?: { amount: number; currency: string }[];
    suggestedSellingPrice?: { amount: number; currency: string; source?: string }[];
    taxesAndFees?: { included: boolean; description: string; amount: number; currency: string }[];
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

export interface ParametrosHoteles {
  ciudad: string;
  pais: string;
  entrada: string;
  salida: string;
  adultos: number;
  menores: number[];
  moneda: string;
  nacionalidad: string;
  limite: number;
}

export async function buscarHoteles(p: ParametrosHoteles): Promise<RespuestaTarifas> {
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
      cityName: p.ciudad,
      countryCode: p.pais,
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

export async function reservarHotel(args: {
  prebookId: string;
  huesped: HuespedHotel;
  referencia: string;
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
      clientReference: args.referencia,
    }),
  });
}
