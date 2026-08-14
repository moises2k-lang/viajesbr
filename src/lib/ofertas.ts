import type { Oferta, RebanadaOferta } from "@/lib/duffel";
import { bandera, nombrePais } from "@/lib/paises";

/** Duffel rellena el número con ceros ("0073"): la aerolínea lo publica como AV73. */
function numeroDeVuelo(iata: string, numero: string): string {
  return `${iata}${numero.replace(/^0+/, "")}`;
}

export function minutosEntre(desde: string, hasta: string): number {
  return Math.round(
    (new Date(hasta).getTime() - new Date(desde).getTime()) / 60000,
  );
}

export interface SegmentoNormalizado {
  vuelo: string;
  aerolineaIata: string;
  origen: string;
  destino: string;
  origenNombre: string;
  destinoNombre: string;
  origenCiudad: string | null;
  destinoCiudad: string | null;
  origenPais: string | null;
  destinoPais: string | null;
  origenBandera: string | null;
  destinoBandera: string | null;
  sale: string;
  llega: string;
  minutos: number;
  esperaMinutos: number | null;
  cabina: string | null;
  aerolinea: string;
  avion: string | null;
}

export interface TramoNormalizado {
  origen: string;
  destino: string;
  origenNombre: string;
  destinoNombre: string;
  origenCiudad: string | null;
  destinoCiudad: string | null;
  origenPais: string | null;
  destinoPais: string | null;
  origenBandera: string | null;
  destinoBandera: string | null;
  duracion: string | null;
  minutos: number;
  escalas: number;
  marcaTarifa: string | null;
  equipaje: { tipo: string; cantidad: number }[];
  segmentos: SegmentoNormalizado[];
}

export interface OfertaConPrecio {
  ofertaId: string;
  cotizacionId?: string | null;
  aerolinea: string;
  aerolineaIata: string;
  logo: string | null;
  moneda: string;
  costoNeto: number;
  markup: number;
  precioVenta: number;
  expiraEn: string;
  cambiosPermitidos: boolean | null;
  reembolsoPermitido: boolean | null;
  pasajeros: { tipo: string; edad: number | null }[];
  tramos: TramoNormalizado[];
}

export function normalizarTramo(tramo: RebanadaOferta): TramoNormalizado {
  return {
    origen: tramo.origin.iata_code,
    destino: tramo.destination.iata_code,
    origenNombre: tramo.origin.name,
    destinoNombre: tramo.destination.name,
    origenCiudad: tramo.origin.city_name ?? null,
    destinoCiudad: tramo.destination.city_name ?? null,
    origenPais: tramo.origin.iata_country_code
      ? nombrePais(tramo.origin.iata_country_code)
      : null,
    destinoPais: tramo.destination.iata_country_code
      ? nombrePais(tramo.destination.iata_country_code)
      : null,
    origenBandera: tramo.origin.iata_country_code
      ? bandera(tramo.origin.iata_country_code)
      : null,
    destinoBandera: tramo.destination.iata_country_code
      ? bandera(tramo.destination.iata_country_code)
      : null,
    duracion: tramo.duration ?? null,
    minutos: minutosEntre(
      tramo.segments[0].departing_at,
      tramo.segments[tramo.segments.length - 1].arriving_at,
    ),
    escalas: tramo.segments.length - 1,
    marcaTarifa: tramo.fare_brand_name ?? null,
    equipaje:
      tramo.segments[0]?.passengers?.[0]?.baggages?.map((b) => ({
        tipo: b.type,
        cantidad: b.quantity,
      })) ?? [],
    segmentos: tramo.segments.map((segmento, indice) => ({
      vuelo: numeroDeVuelo(
        segmento.marketing_carrier.iata_code,
        segmento.marketing_carrier_flight_number,
      ),
      aerolineaIata: segmento.marketing_carrier.iata_code,
      origen: segmento.origin.iata_code,
      destino: segmento.destination.iata_code,
      origenNombre: segmento.origin.name,
      destinoNombre: segmento.destination.name,
      origenCiudad: segmento.origin.city_name ?? null,
      destinoCiudad: segmento.destination.city_name ?? null,
      origenPais: segmento.origin.iata_country_code
        ? nombrePais(segmento.origin.iata_country_code)
        : null,
      destinoPais: segmento.destination.iata_country_code
        ? nombrePais(segmento.destination.iata_country_code)
        : null,
      origenBandera: segmento.origin.iata_country_code
        ? bandera(segmento.origin.iata_country_code)
        : null,
      destinoBandera: segmento.destination.iata_country_code
        ? bandera(segmento.destination.iata_country_code)
        : null,
      sale: segmento.departing_at,
      llega: segmento.arriving_at,
      minutos: minutosEntre(segmento.departing_at, segmento.arriving_at),
      esperaMinutos:
        indice === 0
          ? null
          : minutosEntre(
              tramo.segments[indice - 1].arriving_at,
              segmento.departing_at,
            ),
      cabina: segmento.passengers?.[0]?.cabin_class_marketing_name ?? null,
      aerolinea: segmento.marketing_carrier.name,
      avion: segmento.aircraft?.name ?? null,
    })),
  };
}

export function normalizarOferta(
  oferta: Oferta,
  precio: { costoNeto: number; markup: number; precioVenta: number },
): OfertaConPrecio {
  return {
    ofertaId: oferta.id,
    aerolinea: oferta.owner.name,
    aerolineaIata: oferta.owner.iata_code,
    logo: oferta.owner.logo_symbol_url ?? null,
    moneda: oferta.total_currency,
    costoNeto: precio.costoNeto,
    markup: precio.markup,
    precioVenta: precio.precioVenta,
    expiraEn: oferta.expires_at,
    cambiosPermitidos:
      oferta.conditions?.change_before_departure?.allowed ?? null,
    reembolsoPermitido:
      oferta.conditions?.refund_before_departure?.allowed ?? null,
    pasajeros: oferta.passengers.map((p) => ({
      tipo: p.type ?? (typeof p.age === "number" ? "child" : "adult"),
      edad: typeof p.age === "number" ? p.age : null,
    })),
    tramos: oferta.slices.map(normalizarTramo),
  };
}

/**
 * Identidad de un tramo por sus vuelos y horas de salida: dos ofertas con la
 * misma clave llevan al pasajero exactamente en los mismos aviones.
 */
export function claveTramo(tramo: RebanadaOferta): string {
  return tramo.segments
    .map(
      (s) =>
        `${numeroDeVuelo(s.marketing_carrier.iata_code, s.marketing_carrier_flight_number)}@${s.departing_at}`,
    )
    .join("|");
}

/**
 * El equipaje lo define la tarifa, no la ruta: se lee de la oferta y nunca de la
 * opción de tramo, que es compartida por tarifas con y sin maleta.
 */
function rebanadaConMaleta(tramo: RebanadaOferta): boolean {
  return (
    tramo.segments[0]?.passengers?.[0]?.baggages?.some(
      (b) => b.type === "checked" && b.quantity > 0,
    ) ?? false
  );
}

/** Opción de un tramo suelto (una ida o un regreso concretos) para armar el viaje. */
export interface OpcionTramo {
  id: number;
  indice: number;
  clave: string;
  precioMinimo: number;
  tramo: TramoNormalizado;
}

/** Combinación válida de opciones (una por tramo) con la tarifa que la vende. */
export interface CombinacionTramos {
  opciones: number[];
  ofertaId: string;
  costoNeto: number;
  markup: number;
  precioVenta: number;
  aerolineaIata: string;
  marcaTarifa: string | null;
  conMaleta: boolean;
  cambiosPermitidos: boolean | null;
  reembolsoPermitido: boolean | null;
}

export interface AerolineaResumen {
  nombre: string;
  logo: string | null;
}

/** Tope de seguridad: cada combinación pesa poco y recortar barato tira los itinerarios caros que el cliente sí pidió. */
const MAXIMO_COMBINACIONES = 8000;

/**
 * Descompone todas las ofertas en opciones por tramo y en las combinaciones que
 * de verdad se pueden comprar juntas, para elegir la ida y el regreso por
 * separado sin inventar combinaciones que ninguna aerolínea vende.
 */
export function armarOpcionesPorTramo(
  ofertas: {
    oferta: Oferta;
    precio: { costoNeto: number; markup: number; precioVenta: number };
  }[],
): {
  opciones: OpcionTramo[];
  combinaciones: CombinacionTramos[];
  aerolineas: Record<string, AerolineaResumen>;
} {
  const opciones = new Map<string, OpcionTramo>();
  const combinaciones = new Map<string, CombinacionTramos>();
  const aerolineas: Record<string, AerolineaResumen> = {};

  for (const { oferta, precio } of ofertas) {
    const ids: number[] = [];
    for (const [indice, rebanada] of oferta.slices.entries()) {
      const clave = claveTramo(rebanada);
      const llave = `${indice}::${clave}`;
      let opcion = opciones.get(llave);
      if (!opcion) {
        opcion = {
          id: opciones.size,
          indice,
          clave,
          precioMinimo: precio.precioVenta,
          // Equipaje y marca pertenecen a la tarifa, no al tramo compartido.
          tramo: {
            ...normalizarTramo(rebanada),
            equipaje: [],
            marcaTarifa: null,
          },
        };
        opciones.set(llave, opcion);
      } else if (precio.precioVenta < opcion.precioMinimo) {
        opcion.precioMinimo = precio.precioVenta;
      }
      ids.push(opcion.id);
    }

    const conMaleta = oferta.slices.every(rebanadaConMaleta);
    const marca = oferta.slices[0]?.fare_brand_name ?? "";
    /** Misma ruta con distinta familia de tarifa o equipaje son opciones distintas de compra. */
    const llaveCombo = `${ids.join(">")}|${conMaleta ? 1 : 0}|${marca}`;
    const actual = combinaciones.get(llaveCombo);
    if (!actual || precio.precioVenta < actual.precioVenta) {
      aerolineas[oferta.owner.iata_code] = {
        nombre: oferta.owner.name,
        logo: oferta.owner.logo_symbol_url ?? null,
      };
      combinaciones.set(llaveCombo, {
        opciones: ids,
        ofertaId: oferta.id,
        costoNeto: precio.costoNeto,
        markup: precio.markup,
        precioVenta: precio.precioVenta,
        aerolineaIata: oferta.owner.iata_code,
        marcaTarifa: marca === "" ? null : marca,
        conMaleta,
        cambiosPermitidos:
          oferta.conditions?.change_before_departure?.allowed ?? null,
        reembolsoPermitido:
          oferta.conditions?.refund_before_departure?.allowed ?? null,
      });
    }
  }

  const lista = [...combinaciones.values()]
    .sort((a, b) => a.precioVenta - b.precioVenta)
    .slice(0, MAXIMO_COMBINACIONES);
  const usadas = new Set(lista.flatMap((combo) => combo.opciones));

  return {
    opciones: [...opciones.values()].filter((opcion) => usadas.has(opcion.id)),
    combinaciones: lista,
    aerolineas,
  };
}
