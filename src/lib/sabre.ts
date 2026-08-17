import { randomUUID } from "node:crypto";
import type {
  Oferta,
  ParametrosBusqueda,
  RebanadaOferta,
  SegmentoOferta,
  SolicitudOfertas,
} from "@/lib/duffel";

const SABRE_URL = "https://api.cert.platform.sabre.com";

interface CacheToken {
  token: string;
  expires: number;
}

let tokenCache: CacheToken | null = null;

export function esSabreActivo(): boolean {
  return Boolean(process.env.SABRE_EPR && process.env.SABRE_PASSWORD);
}

function authHeader(): string {
  const epr = process.env.SABRE_EPR!;
  const pass = process.env.SABRE_PASSWORD!;
  const b64Epr = Buffer.from(epr, "utf8").toString("base64");
  const b64Pass = Buffer.from(pass, "utf8").toString("base64");
  return `Basic ${Buffer.from(`${b64Epr}:${b64Pass}`, "utf8").toString("base64")}`;
}

async function sabreToken(): Promise<string> {
  if (tokenCache && tokenCache.expires > Date.now() + 60_000) {
    return tokenCache.token;
  }
  const resp = await fetch(`${SABRE_URL}/v2/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: authHeader(),
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Sabre auth ${resp.status}: ${text.slice(0, 500)}`);
  }
  const data = JSON.parse(text) as {
    access_token: string;
    expires_in: number;
  };
  tokenCache = {
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

async function sabreFetch<T>(ruta: string, init: RequestInit): Promise<T> {
  const token = await sabreToken();
  const resp = await fetch(`${SABRE_URL}${ruta}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Sabre ${resp.status}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as T;
}

interface SabreFlight {
  id: string;
  departureAirportCode: string;
  departureDate: string;
  departureTime: string;
  arrivalAirportCode: string;
  arrivalDate: string;
  arrivalTime: string;
  operatingAirlineCode: string;
  operatingFlightNumber: number | string;
  marketingAirlineCode: string;
  marketingFlightNumber: number | string;
  disclosureAirlineCode?: string;
  aircraftTypeCode: string;
  durationInMinutes: number;
}

interface SabreJourney {
  id: string;
  requestedJourneyIndex: number;
  flightRefs: string[];
}

interface SabreFareComponent {
  amount: string;
  currencyCode: string;
  publishedAmount: string;
  publishedCurrencyCode: string;
  fareBasisCode: string;
  segmentDetails: {
    flightRef: string;
    bookingClassCode: string;
    cabinName: string;
  }[];
}

interface SabreFare {
  travelers: { passengerTypeCode: string }[];
  fareTotal: {
    equivalentFare: string;
    taxAmount: string;
    amount: string;
    currencyCode: string;
  };
  validatingAirlineCode: string;
  fareComponents: SabreFareComponent[];
}

interface SabreOffer {
  type: "FlightOffer";
  id: string;
  createdAt: string;
  validUntil: string;
  source: { provider: string; distributionModel: string };
  totalPrice: { amount: string; currencyCode: string };
  items: {
    type: "FlightOfferItem";
    fares: SabreFare[];
    isPartial: boolean;
    id: string;
    isMandatory: boolean;
  }[];
  paymentTimeLimit?: string;
  journeyRefs: string[];
}

interface SabreFlightSearchResponse {
  timestamp: string;
  flights?: SabreFlight[];
  journeys?: SabreJourney[];
  offers?: SabreOffer[];
}

function isoDateTime(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function carrier(code: string) {
  return { iata_code: code, name: code };
}

function lugar(code: string): {
  iata_code: string;
  name: string;
  city_name?: string;
  iata_country_code?: string;
} {
  return { iata_code: code, name: code };
}

function n(s: number | string): string {
  return String(s);
}

function duracionIso(min: number): string {
  return `PT${min}M`;
}

export async function buscarOfertas(
  p: ParametrosBusqueda,
): Promise<SolicitudOfertas> {
  if (!esSabreActivo()) {
    throw new Error("Faltan SABRE_EPR y SABRE_PASSWORD");
  }
  if (p.tramos && p.tramos.length > 1) {
    throw new Error("Sabre Flight Search aún no soporta multiciudad");
  }

  const totalPassengers = p.adultos + p.menores.length + p.bebes;
  const fechaSalida = p.fechaSalida;
  const fechaRegreso = p.fechaRegreso;

  const body: Record<string, unknown> = {
    departureLocation: {
      locationType: "Airport",
      locationCode: p.origen,
    },
    departureDateRange: {
      fromDate: fechaSalida,
      toDate: fechaSalida,
    },
    processingOptions: {
      publicContentPointOfSaleCountry: "US",
      returnLowestNonStopFare: true,
      returnFullOffers: true,
      returnMode: "Per Day",
    },
    sources: {
      providers: ["Sabre"],
      distributionModels: ["ATPCO"],
    },
  };

  if (fechaRegreso) {
    const inicio = new Date(fechaSalida);
    const fin = new Date(fechaRegreso);
    const diff = Math.max(1, Math.round((fin.getTime() - inicio.getTime()) / 86400000));
    body.lengthsOfStay = [diff];
  }

  const data = await sabreFetch<SabreFlightSearchResponse>("/v1/offers/flightSearch", {
    method: "POST",
    body: JSON.stringify(body),
  });

  const flights = new Map(data.flights?.map((f) => [f.id, f]) ?? []);
  const journeys = new Map(data.journeys?.map((j) => [j.id, j]) ?? []);

  const flightMapByRef = flights;
  const journeyMapByRef = journeys;

  const offerCandidates = data.offers ?? [];
  const offers: Oferta[] = [];

  for (const offer of offerCandidates) {
    const slices = offer.journeyRefs.map((journeyRef) => {
      const journey = journeyMapByRef.get(journeyRef);
      if (!journey) throw new Error(`Journey ${journeyRef} no encontrado`);

      const segments: SegmentoOferta[] = journey.flightRefs.map((flightRef) => {
        const flight = flightMapByRef.get(flightRef);
        if (!flight) throw new Error(`Flight ${flightRef} no encontrado`);

        const cabin = cabinForFlight(offer, flightRef) ?? "Economy";

        return {
          id: flight.id,
          origin: lugar(flight.departureAirportCode),
          destination: lugar(flight.arrivalAirportCode),
          departing_at: isoDateTime(flight.departureDate, flight.departureTime),
          arriving_at: isoDateTime(flight.arrivalDate, flight.arrivalTime),
          duration: duracionIso(flight.durationInMinutes),
          marketing_carrier: carrier(flight.marketingAirlineCode),
          marketing_carrier_flight_number: n(flight.marketingFlightNumber),
          operating_carrier: carrier(flight.operatingAirlineCode),
          aircraft: { name: flight.aircraftTypeCode },
          passengers: [
            {
              passenger_id: "p1",
              cabin_class_marketing_name: cabin,
              baggages: [],
            },
          ],
        };
      });

      const first = segments[0];
      const last = segments[segments.length - 1];

      return {
        id: journey.id,
        origin: first.origin,
        destination: last.destination,
        segments,
        fare_brand_name: null,
      };
    });

    if (p.destino) {
      const dest = slices[0]?.destination.iata_code;
      if (dest && dest !== p.destino) continue;
      if (slices.length > 1 && slices[1]?.destination.iata_code !== p.origen) continue;
    }

    const pricePerAdult = Number(offer.totalPrice.amount);
    const total = (pricePerAdult * totalPassengers).toFixed(2);
    const fare = offer.items[0]?.fares[0];
    const base = fare
      ? (Number(fare.fareTotal.equivalentFare) * totalPassengers).toFixed(2)
      : null;
    const tax = fare
      ? (Number(fare.fareTotal.taxAmount) * totalPassengers).toFixed(2)
      : null;

    const passengerList: { id: string; type: "adult" | "child" | "infant_without_seat"; age?: number }[] = [];
    let pid = 1;
    for (let i = 0; i < p.adultos; i++) {
      passengerList.push({ id: `p${pid++}`, type: "adult" });
    }
    for (const edad of p.menores) {
      passengerList.push({ id: `p${pid++}`, type: "child", age: edad });
    }
    for (let i = 0; i < p.bebes; i++) {
      passengerList.push({ id: `p${pid++}`, type: "infant_without_seat" });
    }

    const owner = fare?.validatingAirlineCode ?? slices[0]?.segments[0]?.marketing_carrier.iata_code ?? "Sabre";

    const oferta: Oferta = {
      id: offer.id,
      total_amount: total,
      total_currency: offer.totalPrice.currencyCode,
      base_amount: base,
      tax_amount: tax,
      expires_at: offer.validUntil ?? offer.paymentTimeLimit ?? new Date(Date.now() + 30 * 60_000).toISOString(),
      owner: { iata_code: owner, name: owner },
      slices: slices as RebanadaOferta[],
      passengers: passengerList,
    };

    offers.push(oferta);
  }

  return {
    id: randomUUID(),
    offers,
  };
}

function cabinForFlight(offer: SabreOffer, flightRef: string): string | undefined {
  for (const item of offer.items) {
    for (const fare of item.fares) {
      for (const comp of fare.fareComponents) {
        for (const detail of comp.segmentDetails) {
          if (detail.flightRef === flightRef) return detail.cabinName;
        }
      }
    }
  }
  return undefined;
}
