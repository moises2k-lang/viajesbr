import { NextResponse } from "next/server";
import { z } from "zod";
import { listarPaquetes, categoriasPaquete } from "@/lib/experiencias";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const paqueteSchema = z.object({
  slug: z.string().trim().min(3),
  categoria: z.string().trim().min(2),
  titulo: z.string().trim().min(3),
  subtitulo: z.string().trim().nullable().optional(),
  descripcion: z.string().trim().nullable().optional(),
  imagen: z.string().trim().nullable().optional(),
  origenIata: z.string().trim().length(3).nullable().optional(),
  destinoIata: z.string().trim().length(3),
  destinoCiudad: z.string().trim().min(2),
  destinoPaisCode: z.string().trim().length(2).nullable().optional(),
  duracionNoches: z.number().int().min(1).nullable().optional(),
  adultos: z.number().int().min(1).default(1),
  menores: z.array(z.number().int().min(0).max(17)).default([]),
  bebes: z.number().int().min(0).default(0),
  cabina: z.enum(["economy", "premium_economy", "business", "first"]).nullable().optional(),
  aerolineasPreferidas: z.array(z.string()).default([]),
  hotelEstrellasMin: z.number().int().min(1).max(5).nullable().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoria = searchParams.get("categoria")?.trim() || undefined;
  try {
    const paquetes = await listarPaquetes(categoria);
    return NextResponse.json({ paquetes, categorias: categoriasPaquete() });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const validado = paqueteSchema.safeParse(cuerpo);
  if (!validado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: validado.error.issues },
      { status: 400 },
    );
  }
  const p = validado.data;
  try {
    const [insertado] = await query<{ id: string; slug: string }>(
      `INSERT INTO paquetes_tematicos (
        slug, categoria, titulo, subtitulo, descripcion, imagen, origen_iata,
        destino_iata, destino_ciudad, destino_pais_code, duracion_noches, adultos,
        menores, bebes, cabina, aerolineas_preferidas, hotel_estrellas_min, tags
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id::text, slug`,
      [
        p.slug, p.categoria, p.titulo, p.subtitulo ?? null, p.descripcion ?? null,
        p.imagen ?? null, p.origenIata?.toUpperCase() ?? null,
        p.destinoIata.toUpperCase(), p.destinoCiudad, p.destinoPaisCode?.toUpperCase() ?? null,
        p.duracionNoches ?? null, p.adultos, p.menores, p.bebes,
        p.cabina ?? "economy", p.aerolineasPreferidas, p.hotelEstrellasMin ?? null, p.tags,
      ],
    );
    return NextResponse.json(insertado, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
