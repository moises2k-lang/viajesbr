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
  const data = JSON.parse(text) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function sabreFetch<T>(ruta: string, init: RequestInit): Promise<T> {
  const token = await sabreToken();
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (init.method && init.method !== "GET" && init.method !== "HEAD") {
    baseHeaders["Content-Type"] = "application/json";
  }
  const resp = await fetch(`${SABRE_URL}${ruta}`, {
    ...init,
    headers: {
      ...baseHeaders,
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Sabre ${resp.status}: ${text.slice(0, 2000)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Sabre returned non-JSON (status ${resp.status}): ${text.slice(0, 4000)}`);
  }
}

// ---------------------------------------------------------------------------
// BFM v5 types
// ---------------------------------------------------------------------------

interface BFMRequest {
  OTA_AirLowFareSearchRQ: {
    Version: string;
    ResponseVersion?: string;
    Target?: string;
    TruncateMessages?: boolean;
    POS: {
      Source: Array<{
        PseudoCityCode: string;
        RequestorID: {
          Type: string;
          ID: string;
          CompanyName: { Code: string };
        };
      }>;
    };
    OriginDestinationInformation: Array<{
      RPH: string;
      DepartureDateTime: string;
      OriginLocation: { LocationCode: string };
      DestinationLocation: { LocationCode: string };
      TPA_Extensions?: { SegmentType: { Code: string } };
    }>;
    TravelPreferences?: {
      CabinPref?: { Cabin: string; PreferLevel: string }[];
      TPA_Extensions?: {
        DataSources?: { NDC: string; ATPCO: string; LCC: string };
      };
    };
    TravelerInfoSummary: {
      SeatsRequested?: number[];
      AirTravelerAvail: Array<{
        PassengerTypeQuantity: Array<{ Code: string; Quantity: number }>;
      }>;
      PriceRequestInformation?: {
        TPA_Extensions?: {
          BrandedFareIndicators?: { MultipleBrandedFares: boolean };
        };
      };
    };
    TPA_Extensions?: {
      IntelliSellTransaction: {
        RequestType: { Name: string };
      };
    };
  };
}

interface ScheduleDesc {
  id: number;
  departure: {
    airport: string;
    city: string;
    country: string;
    time: string;
    terminal?: string;
    dateAdjustment?: number;
  };
  arrival: {
    airport: string;
    city: string;
    country: string;
    time: string;
    terminal?: string;
    dateAdjustment?: number;
  };
  carrier: {
    marketing: string;
    marketingFlightNumber: number | string;
    operating: string;
    operatingFlightNumber: number | string;
    equipment?: { code?: string };
  };
  elapsedTime: number;
}

interface LegDesc {
  id: number;
  elapsedTime: number;
  schedules: Array<{ ref: number }>;
}

interface PricingInfo {
  pricingSubsource: string;
  distributionModel: string;
  offer?: { offerId: string; timeToLive: number; source: string };
  fare?: Fare;
  soldOut?: unknown;
}

interface Fare {
  offerItemId: string;
  serviceId: string;
  validatingCarrierCode: string;
  governingCarriers?: string;
  passengerInfoList: Array<{ passengerInfo: PassengerInfo }>;
  totalFare: {
    totalPrice: number;
    totalTaxAmount: number;
    currency: string;
    baseFareAmount: number;
    baseFareCurrency: string;
  };
}

interface PassengerInfo {
  passengerType: string;
  passengerNumber: number;
  nonRefundable: boolean;
  fareComponents: Array<{
    ref: number;
    beginAirport: string;
    endAirport: string;
    brand?: { brandName?: string; code?: string };
    segments: Array<{ segment: { bookingCode?: string; cabinCode?: string; mealCode?: string; seatsAvailable?: number; availabilityBreak?: boolean; fareBreakPoint?: boolean } }>;
  }>;
  baggageInformation?: Array<{
    provisionType: string;
    airlineCode: string;
    segments: Array<{ id: number }>;
    allowance: { ref: number };
  }>;
  passengerTotalFare: {
    totalFare: number;
    totalTaxAmount: number;
    currency: string;
    baseFareAmount: number;
    baseFareCurrency: string;
  };
}

interface Itinerary {
  id: number;
  pricingSource: string;
  legs: Array<{ ref: number }>;
  pricingInformation: PricingInfo[];
}

interface ItineraryGroup {
  groupDescription: {
    legDescriptions: Array<{
      departureDate: string;
      departureLocation: string;
      arrivalLocation: string;
    }>;
  };
  itineraries: Itinerary[];
}

interface SabreBFMResponse {
  groupedItineraryResponse: {
    version: string;
    messages?: Array<{ severity: string; type: string; code: string; text: string }>;
    statistics?: { itineraryCount: number };
    scheduleDescs: ScheduleDesc[];
    legDescs: LegDesc[];
    baggageAllowanceDescs?: Array<{ id: number; pieceCount?: number }>;
    itineraryGroups: ItineraryGroup[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pcc(): string {
  const explicit = process.env.SABRE_PCC?.trim();
  if (explicit) return explicit;
  const epr = process.env.SABRE_EPR ?? "";
  const parts = epr.split(":");
  if (parts.length >= 3) return parts[2];
  // Fallback para el entorno cert de Sabre. En producción usar SABRE_PCC.
  return "7KFA";
}

function pasajeroSabre(edad?: number): string {
  if (edad === undefined) return "ADT";
  if (edad < 2) return "INF";
  if (edad <= 11) return `C${String(edad).padStart(2, "0")}`;
  return "ADT";
}

function codigoCabina(cabina?: string | null): string | undefined {
  const map: Record<string, string> = {
    economy: "Y",
    premium_economy: "S",
    business: "C",
    first: "F",
  };
  return cabina ? map[cabina] : undefined;
}

function nombreCabina(code?: string): string {
  const map: Record<string, string> = {
    Y: "Economy",
    S: "Premium Economy",
    W: "Premium Economy",
    C: "Business",
    J: "Premium Business",
    F: "First",
    P: "Premium First",
  };
  return (code ? map[code] : undefined) ?? "Economy";
}

function duracionIso(min: number): string {
  return `PT${min}M`;
}

function carrier(code: string) {
  return { iata_code: code, name: code };
}

function lugar(code: string, city?: string, country?: string) {
  return {
    iata_code: code,
    name: code,
    city_name: city ?? undefined,
    iata_country_code: country ?? undefined,
  };
}

function n(s: number | string | undefined): string {
  return s === undefined ? "" : String(s);
}

interface TimeParsed {
  h: number;
  m: number;
  s: number;
  offsetMin: number;
}

function parseTime(time: string): TimeParsed {
  const m = time.match(/^(\d{2}):(\d{2}):(\d{2})(?:(Z)|([+-])(\d{2}):(\d{2}))?$/);
  if (!m) throw new Error(`Formato de hora inválido: ${time}`);
  let offsetMin = 0;
  if (m[5]) {
    const sign = m[5] === "+" ? 1 : -1;
    offsetMin = sign * (Number(m[6]) * 60 + Number(m[7]));
  }
  return {
    h: Number(m[1]),
    m: Number(m[2]),
    s: Number(m[3]),
    offsetMin,
  };
}

function timeWithOffset(time: string, base: Date): string {
  const parsed = parseTime(time);
  const localMs = base.getTime() + parsed.offsetMin * 60_000;
  const local = new Date(localMs);
  const pad = (v: number) => String(v).padStart(2, "0");
  const yyyy = local.getUTCFullYear();
  const mm = pad(local.getUTCMonth() + 1);
  const dd = pad(local.getUTCDate());
  const hh = pad(local.getUTCHours());
  const mi = pad(local.getUTCMinutes());
  const ss = pad(local.getUTCSeconds());
  const sign = parsed.offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(parsed.offsetMin);
  const oh = pad(Math.floor(abs / 60));
  const om = pad(abs % 60);
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${oh}:${om}`;
}

function toUtc(date: string, time: string): number {
  const parsed = parseTime(time);
  const tno = `${String(parsed.h).padStart(2, "0")}:${String(parsed.m).padStart(2, "0")}:${String(parsed.s).padStart(2, "0")}`;
  return new Date(`${date}T${tno}Z`).getTime() - parsed.offsetMin * 60_000;
}

function monedaDos(num: number): string {
  return Number(num).toFixed(2);
}

// ---------------------------------------------------------------------------
// Request builder
// ---------------------------------------------------------------------------

export async function buscarOfertas(p: ParametrosBusqueda): Promise<SolicitudOfertas> {
  if (!esSabreActivo()) {
    throw new Error("Faltan SABRE_EPR y SABRE_PASSWORD");
  }

  const pseudoCityCode = pcc();

  const odis =
    p.tramos && p.tramos.length > 1
      ? p.tramos.map((t, i) => ({
          RPH: String(i + 1),
          DepartureDateTime: `${t.fecha}T00:00:00`,
          OriginLocation: { LocationCode: t.origen.toUpperCase() },
          DestinationLocation: { LocationCode: t.destino.toUpperCase() },
          TPA_Extensions: { SegmentType: { Code: "O" } },
        }))
      : [
          {
            RPH: "1",
            DepartureDateTime: `${p.fechaSalida}T00:00:00`,
            OriginLocation: { LocationCode: p.origen.toUpperCase() },
            DestinationLocation: { LocationCode: p.destino.toUpperCase() },
            TPA_Extensions: { SegmentType: { Code: "O" } },
          },
          ...(p.fechaRegreso
            ? [
                {
                  RPH: "2",
                  DepartureDateTime: `${p.fechaRegreso}T00:00:00`,
                  OriginLocation: { LocationCode: p.destino.toUpperCase() },
                  DestinationLocation: { LocationCode: p.origen.toUpperCase() },
                  TPA_Extensions: { SegmentType: { Code: "O" } },
                },
              ]
            : []),
        ];

  const ptc: Record<string, number> = { ADT: p.adultos };
  for (const edad of p.menores) {
    const code = pasajeroSabre(edad);
    ptc[code] = (ptc[code] ?? 0) + 1;
  }
  for (let i = 0; i < p.bebes; i++) {
    ptc["INF"] = (ptc["INF"] ?? 0) + 1;
  }

  const passengerTypeQuantity = Object.entries(ptc).map(([Code, Quantity]) => ({
    Code,
    Quantity,
  }));

  const seatsRequested = [p.adultos + p.menores.length];

  const body: BFMRequest = {
    OTA_AirLowFareSearchRQ: {
      Version: process.env.SABRE_BFM_VERSION ?? "DEV",
      ResponseVersion: process.env.SABRE_BFM_VERSION ?? "DEV",
      Target: "Production",
      TruncateMessages: false,
      POS: {
        Source: [
          {
            PseudoCityCode: pseudoCityCode,
            RequestorID: {
              Type: "1",
              ID: "1",
              CompanyName: { Code: "TN" },
            },
          },
        ],
      },
      OriginDestinationInformation: odis,
      TravelPreferences: {
        ...(p.cabina
          ? {
              CabinPref: [
                { Cabin: codigoCabina(p.cabina)!, PreferLevel: "Only" },
              ],
            }
          : {}),
        TPA_Extensions: {
          DataSources: { NDC: "Disable", ATPCO: "Enable", LCC: "Enable" },
        },
      },
      TravelerInfoSummary: {
        SeatsRequested: seatsRequested,
        AirTravelerAvail: [{ PassengerTypeQuantity: passengerTypeQuantity }],
        PriceRequestInformation: {
          TPA_Extensions: {
            BrandedFareIndicators: { MultipleBrandedFares: true },
          },
        },
      },
      TPA_Extensions: {
        IntelliSellTransaction: {
          RequestType: { Name: "50ITINS" },
        },
      },
    },
  };

  const data = await sabreFetch<SabreBFMResponse>("/v5/offers/shop", {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.error(
    "[Sabre BFM] body:",
    JSON.stringify(body),
    "groups:",
    data.groupedItineraryResponse.itineraryGroups?.length ?? 0,
    "itineraries:",
    data.groupedItineraryResponse.statistics?.itineraryCount ?? 0,
  );

  return mapBFMResponse(p, data);
}

// ---------------------------------------------------------------------------
// Response mapper
// ---------------------------------------------------------------------------

function mapBFMResponse(p: ParametrosBusqueda, data: SabreBFMResponse): SolicitudOfertas {
  const resp = data.groupedItineraryResponse;
  const scheduleById = new Map(resp.scheduleDescs.map((s) => [s.id, s]));
  const legById = new Map(resp.legDescs.map((l) => [l.id, l]));
  const baggageById = new Map((resp.baggageAllowanceDescs ?? []).map((b) => [b.id, b]));

  const offers: Oferta[] = [];

  for (const group of resp.itineraryGroups ?? []) {
    const legDates = group.groupDescription.legDescriptions;
    for (const itinerary of group.itineraries) {
      for (const pricing of itinerary.pricingInformation) {
        if (!pricing.fare || !pricing.offer) continue;
        const offer = buildOffer(
          p,
          pricing,
          itinerary,
          legDates,
          scheduleById,
          legById,
          baggageById,
        );
        if (offer) offers.push(offer);
      }
    }
  }

  return { id: randomUUID(), offers };
}

function buildOffer(
  p: ParametrosBusqueda,
  pricing: PricingInfo,
  itinerary: Itinerary,
  legDates: { departureDate: string; departureLocation: string; arrivalLocation: string }[],
  scheduleById: Map<number, ScheduleDesc>,
  legById: Map<number, LegDesc>,
  baggageById: Map<number, { pieceCount?: number }>,
): Oferta | null {
  const fare = pricing.fare!;
  const offerMeta = pricing.offer!;

  const slices: RebanadaOferta[] = [];
  for (let legIndex = 0; legIndex < itinerary.legs.length; legIndex++) {
    const legRef = itinerary.legs[legIndex];
    const legDesc = legById.get(legRef.ref);
    if (!legDesc) return null;
    const legDate = legDates[legIndex]?.departureDate;
    if (!legDate) return null;

    const segments: SegmentoOferta[] = [];
    let previousArrivalUtc = -Infinity;

    for (const scheduleRef of legDesc.schedules) {
      const schedule = scheduleById.get(scheduleRef.ref);
      if (!schedule) return null;

      let departureUtc = toUtc(legDate, schedule.departure.time);
      if (previousArrivalUtc !== -Infinity) {
        const minConnection = 60 * 60 * 1000;
        while (departureUtc <= previousArrivalUtc + minConnection) {
          departureUtc += 24 * 60 * 60 * 1000;
        }
      }
      const arrivalUtc = departureUtc + schedule.elapsedTime * 60_000;

      const departingAt = timeWithOffset(schedule.departure.time, new Date(departureUtc));
      const arrivingAt = timeWithOffset(schedule.arrival.time, new Date(arrivalUtc));

      const cabinCode = cabinForSegment(fare, segments.length);
      const brandName = brandForSegment(fare, segments.length);

      segments.push({
        id: `${schedule.id}-${legRef.ref}-${segments.length}`,
        origin: lugar(
          schedule.departure.airport,
          schedule.departure.city,
          schedule.departure.country,
        ),
        destination: lugar(
          schedule.arrival.airport,
          schedule.arrival.city,
          schedule.arrival.country,
        ),
        departing_at: departingAt,
        arriving_at: arrivingAt,
        duration: duracionIso(schedule.elapsedTime),
        marketing_carrier: carrier(schedule.carrier.marketing),
        marketing_carrier_flight_number: n(schedule.carrier.marketingFlightNumber),
        operating_carrier: carrier(schedule.carrier.operating),
        aircraft: { name: schedule.carrier.equipment?.code ?? "" },
        passengers: buildSegmentPassengers(p, fare, segments.length, baggageById),
        // brand name as marketing name of the fare for this segment
        ...(cabinCode ? { marketing_class: cabinCode } : {}),
      } as SegmentoOferta);

      previousArrivalUtc = arrivalUtc;
    }

    if (segments.length === 0) return null;

    const first = segments[0];
    const last = segments[segments.length - 1];

    slices.push({
      id: String(legDesc.id),
      origin: first.origin,
      destination: last.destination,
      segments,
      duration: duracionIso(legDesc.elapsedTime),
      fare_brand_name: brandForSegment(fare, 0) ?? null,
    });
  }

  if (p.destino) {
    const dest = slices[0]?.destination.iata_code;
    if (dest && dest !== p.destino.toUpperCase()) return null;
    const salida = slices[0]?.segments[0]?.departing_at?.slice(0, 10);
    if (salida && salida !== p.fechaSalida) return null;
    if (slices.length > 1 && p.origen) {
      if (slices[1]?.destination.iata_code !== p.origen.toUpperCase()) return null;
      const regreso = slices[1]?.segments[0]?.departing_at?.slice(0, 10);
      if (regreso && regreso !== p.fechaRegreso) return null;
    }
  }

  const totalFare = fare.totalFare;
  const base =
    totalFare.baseFareCurrency === totalFare.currency
      ? monedaDos(totalFare.baseFareAmount)
      : monedaDos(totalFare.totalPrice - totalFare.totalTaxAmount);

  const ownerCode = ownerCodeFromFare(fare, slices);

  const passengerList: { id: string; type: "adult" | "child" | "infant_without_seat"; age?: number }[] = [];
  let pid = 1;
  for (let i = 0; i < p.adultos; i++) passengerList.push({ id: `p${pid++}`, type: "adult" });
  for (const edad of p.menores) passengerList.push({ id: `p${pid++}`, type: "child", age: edad });
  for (let i = 0; i < p.bebes; i++) passengerList.push({ id: `p${pid++}`, type: "infant_without_seat" });

  return {
    id: offerMeta.offerId,
    total_amount: monedaDos(totalFare.totalPrice),
    total_currency: totalFare.currency,
    base_amount: base,
    tax_amount: monedaDos(totalFare.totalTaxAmount),
    expires_at: new Date(Date.now() + (offerMeta.timeToLive ?? 1200) * 1000).toISOString(),
    owner: { iata_code: ownerCode, name: ownerCode },
    slices: slices as RebanadaOferta[],
    passengers: passengerList,
  };
}

function ownerCodeFromFare(fare: Fare, slices: RebanadaOferta[]): string {
  if (fare.governingCarriers && /^[A-Z0-9]{2}([/\s]|$)/.test(fare.governingCarriers)) {
    return fare.governingCarriers.trim().split(/[/\s]/)[0].slice(0, 2).toUpperCase();
  }
  return slices[0]?.segments[0]?.marketing_carrier.iata_code ?? "Sabre";
}

function flattenedSegmentCabinCodes(fare: Fare): string[] {
  const result: string[] = [];
  const firstPassenger = fare.passengerInfoList[0]?.passengerInfo;
  if (!firstPassenger) return result;
  for (const fc of firstPassenger.fareComponents ?? []) {
    for (const seg of fc.segments ?? []) {
      result.push(seg.segment.cabinCode ?? "Y");
    }
  }
  return result;
}

function cabinForSegment(fare: Fare, segmentIndex: number): string {
  const codes = flattenedSegmentCabinCodes(fare);
  return nombreCabina(codes[segmentIndex] ?? codes[0]);
}

function brandForSegment(fare: Fare, segmentIndex: number): string | undefined {
  const firstPassenger = fare.passengerInfoList[0]?.passengerInfo;
  if (!firstPassenger) return undefined;
  const brands: string[] = [];
  for (const fc of firstPassenger.fareComponents ?? []) {
    if (fc.brand?.brandName) {
      for (let i = 0; i < (fc.segments?.length ?? 1); i++) brands.push(fc.brand.brandName);
    } else {
      for (let i = 0; i < (fc.segments?.length ?? 1); i++) brands.push("");
    }
  }
  const name = brands[segmentIndex] ?? brands[0];
  return name || undefined;
}

function buildSegmentPassengers(
  p: ParametrosBusqueda,
  fare: Fare,
  segmentIndex: number,
  baggageById: Map<number, { pieceCount?: number }>,
): { passenger_id: string; cabin_class_marketing_name: string; baggages: { type: string; quantity: number }[] }[] {
  const cabin = cabinForSegment(fare, segmentIndex);
  const firstPassenger = fare.passengerInfoList[0]?.passengerInfo;
  const baggages: { type: string; quantity: number }[] = [];

  if (firstPassenger?.baggageInformation) {
    const info = firstPassenger.baggageInformation.find((b) => b.segments.some((s) => s.id === segmentIndex));
    if (info) {
      const allowance = baggageById.get(info.allowance.ref);
      if (allowance && typeof allowance.pieceCount === "number") {
        baggages.push({ type: "checked", quantity: allowance.pieceCount });
      }
    }
  }

  const passengers: { passenger_id: string; cabin_class_marketing_name: string; baggages: { type: string; quantity: number }[] }[] = [];
  let pid = 1;
  for (let i = 0; i < p.adultos; i++) {
    passengers.push({ passenger_id: `p${pid++}`, cabin_class_marketing_name: cabin, baggages });
  }
  for (let i = 0; i < p.menores.length; i++) {
    passengers.push({ passenger_id: `p${pid++}`, cabin_class_marketing_name: cabin, baggages });
  }
  for (let i = 0; i < p.bebes; i++) {
    passengers.push({ passenger_id: `p${pid++}`, cabin_class_marketing_name: cabin, baggages });
  }
  return passengers;
}
