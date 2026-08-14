import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { hashPassword, crearSesion } from "@/lib/auth";

const esquema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6),
  nombre: z.string().trim().optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const validado = esquema.safeParse(cuerpo);
  if (!validado.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalle: validado.error.issues },
      { status: 400 },
    );
  }
  const { email, password, nombre } = validado.data;

  try {
    const [existente] = await query<{ id: string }>(
      "SELECT id::text FROM usuarios WHERE email = $1 LIMIT 1",
      [email],
    );
    if (existente) {
      return NextResponse.json(
        { error: "Ya existe una cuenta con ese correo" },
        { status: 409 },
      );
    }

    const [usuario] = await query<{ id: string }>(
      `INSERT INTO usuarios (email, nombre, password_hash) VALUES ($1, $2, $3) RETURNING id::text`,
      [email, nombre ?? null, await hashPassword(password)],
    );

    await crearSesion(usuario.id);
    return NextResponse.json(
      { id: usuario.id, email, nombre: nombre ?? null },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error en registro:", error);
    return NextResponse.json(
      { error: "No se pudo crear la cuenta. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }
}
