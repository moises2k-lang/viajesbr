import { NextResponse } from "next/server";
import {
  detalleHotel,
  esAmbientePruebaHoteles,
  resenasHotel,
} from "@/lib/liteapi";
import { bandera, nombrePais } from "@/lib/paises";

export const runtime = "nodejs";
export const maxDuration = 30;

export interface HabitacionCatalogo {
  nombre: string;
  descripcion: string | null;
  metros: number | null;
  ocupacionMaxima: number | null;
  camas: string[];
  servicios: string[];
  fotos: string[];
}

export interface Resena {
  puntaje: number | null;
  autor: string | null;
  fecha: string | null;
  tipo: string | null;
  bueno: string | null;
  malo: string | null;
}

export interface FichaHotel {
  hotelId: string;
  nombre: string;
  descripcion: string | null;
  informacionImportante: string | null;
  entrada: string | null;
  salida: string | null;
  estrellas: number | null;
  calificacion: number | null;
  resenas: number | null;
  direccion: string | null;
  ciudad: string | null;
  pais: string | null;
  bandera: string | null;
  telefono: string | null;
  cadena: string | null;
  tipo: string | null;
  estacionamiento: string | null;
  admiteMenores: boolean | null;
  admiteMascotas: boolean | null;
  latitud: number | null;
  longitud: number | null;
  fotos: string[];
  /** Fotos de habitación de la galería, para las tarifas que no cruzan con el catálogo. */
  fotosHabitaciones: string[];
  servicios: string[];
  habitaciones: HabitacionCatalogo[];
  puntosFuertes: string[];
  puntosDebiles: string[];
  categorias: { nombre: string; calificacion: number }[];
  opiniones: Resena[];
}

/** liteAPI manda la descripción con HTML; la dejamos en texto plano por párrafos. */
function aTexto(html: string | undefined): string | null {
  if (!html) return null;
  const texto = html
    .replace(/<\/(p|div|li|h\d)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return texto === "" ? null : texto;
}

function fichaDemo(hotelId: string, pais: string | null): FichaHotel {
  const partes = hotelId.split("-");
  const idx = Number(partes[partes.length - 1] ?? 0);
  const zonas = ["Zona Centro", "Zona Hotelera", "Ejecutivo"];
  const zona = zonas[idx] ?? "Demo";
  const nombre = `Hotel Demo ${zona}`;
  const paisCodigo = pais?.toUpperCase() ?? "MX";
  const habitacion: HabitacionCatalogo = {
    nombre: "Habitación estándar - Solo hospedaje",
    descripcion: "Habitación de demostración para pruebas en sandbox.",
    metros: 22,
    ocupacionMaxima: 2,
    camas: ["1 cama queen"],
    servicios: ["WiFi", "Desayuno", "Aire acondicionado"],
    fotos: [],
  };
  return {
    hotelId,
    nombre,
    descripcion: "Hotel de demostración generado automáticamente para pruebas en el ambiente sandbox de LiteAPI. No es una reserva real.",
    informacionImportante: "Este hotel es ficticio y solo sirve para probar el flujo de paquetes en sandbox.",
    entrada: "15:00",
    salida: "12:00",
    estrellas: 3 + (idx % 3),
    calificacion: 7.5 + (idx % 3) * 0.4,
    resenas: 42 + idx * 30,
    direccion: `Calle demo, ${zona}`,
    ciudad: "Demo",
    pais: paisCodigo ? nombrePais(paisCodigo) : null,
    bandera: paisCodigo ? bandera(paisCodigo) : null,
    telefono: null,
    cadena: null,
    tipo: "Hotel",
    estacionamiento: null,
    admiteMenores: true,
    admiteMascotas: false,
    latitud: null,
    longitud: null,
    fotos: [],
    fotosHabitaciones: [],
    servicios: ["WiFi", "Desayuno", "Piscina", "Gimnasio"],
    habitaciones: [habitacion],
    puntosFuertes: ["Buena ubicación", "Precio accesible"],
    puntosDebiles: ["Hotel ficticio"],
    categorias: [
      { nombre: "Limpieza", calificacion: 8 },
      { nombre: "Servicio", calificacion: 8 },
    ],
    opiniones: [],
  };
}

export async function GET(
  _peticion: Request,
  { params }: { params: Promise<{ hotelId: string }> },
) {
  const { hotelId } = await params;
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(hotelId)) {
    return NextResponse.json(
      { error: "Identificador de hotel inválido" },
      { status: 400 },
    );
  }

  if (hotelId.startsWith("demo-") && esAmbientePruebaHoteles()) {
    return NextResponse.json(fichaDemo(hotelId, hotelId.split("-")[1]?.toUpperCase() ?? null));
  }

  try {
    const [hotel, opiniones] = await Promise.all([
      detalleHotel(hotelId),
      resenasHotel(hotelId, 8).catch(() => []),
    ]);

    const paisCodigo = hotel.country ? hotel.country.toUpperCase() : null;
    const ficha: FichaHotel = {
      hotelId: hotel.id,
      nombre: hotel.name,
      descripcion: aTexto(hotel.hotelDescription),
      informacionImportante: aTexto(hotel.hotelImportantInformation),
      entrada: hotel.checkinCheckoutTimes?.checkin_start ?? null,
      salida: hotel.checkinCheckoutTimes?.checkout ?? null,
      estrellas: hotel.starRating ?? null,
      calificacion: hotel.rating ?? null,
      resenas: hotel.reviewCount ?? null,
      direccion: [hotel.address, hotel.zip].filter(Boolean).join(", ") || null,
      ciudad: hotel.city ?? null,
      pais: paisCodigo ? nombrePais(paisCodigo) : null,
      bandera: paisCodigo ? bandera(paisCodigo) : null,
      telefono: hotel.phone || null,
      cadena:
        hotel.chain && hotel.chain !== "Not Available" ? hotel.chain : null,
      tipo: hotel.hotelType ?? null,
      estacionamiento: hotel.parking ?? null,
      admiteMenores: hotel.childAllowed ?? null,
      admiteMascotas: hotel.petsAllowed ?? null,
      latitud: hotel.location?.latitude ?? null,
      longitud: hotel.location?.longitude ?? null,
      fotos: (hotel.hotelImages ?? [])
        .map((foto) => foto.urlHd || foto.url)
        .filter((url): url is string => Boolean(url))
        .slice(0, 30),
      fotosHabitaciones: (hotel.hotelImages ?? [])
        .filter((foto) => /room|suite|bed/i.test(foto.caption ?? ""))
        .map((foto) => foto.urlHd || foto.url)
        .filter((url): url is string => Boolean(url))
        .slice(0, 10),
      servicios: (hotel.hotelFacilities ?? []).slice(0, 60),
      habitaciones: (hotel.rooms ?? []).map((habitacion) => ({
        nombre: habitacion.roomName,
        descripcion: aTexto(habitacion.description),
        metros: habitacion.roomSizeSquare ?? null,
        ocupacionMaxima: habitacion.maxOccupancy ?? null,
        camas: (habitacion.bedTypes ?? [])
          .map((cama) =>
            [cama.quantity ? `${cama.quantity} ×` : null, cama.bedType]
              .filter(Boolean)
              .join(" "),
          )
          .filter((texto) => texto !== ""),
        servicios: (habitacion.roomAmenities ?? [])
          .map((servicio) => servicio.name)
          .slice(0, 20),
        fotos: (habitacion.photos ?? [])
          .map((foto) => foto.hd_url || foto.url)
          .filter((url): url is string => Boolean(url))
          .slice(0, 8),
      })),
      puntosFuertes: hotel.sentiment_analysis?.pros ?? [],
      puntosDebiles: hotel.sentiment_analysis?.cons ?? [],
      categorias: (hotel.sentiment_analysis?.categories ?? []).map(
        (categoria) => ({
          nombre: categoria.name,
          calificacion: categoria.rating,
        }),
      ),
      opiniones: opiniones.map((opinion) => ({
        puntaje: opinion.averageScore ?? null,
        autor: opinion.name ?? null,
        fecha: opinion.date ?? null,
        tipo: opinion.type ?? null,
        bueno: opinion.pros?.trim() || null,
        malo: opinion.cons?.trim() || null,
      })),
    };

    return NextResponse.json(ficha);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 502 },
    );
  }
}
