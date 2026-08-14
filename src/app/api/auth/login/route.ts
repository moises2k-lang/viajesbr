import { NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { verifyPassword, crearSesion } from "@/lib/auth";

const esquema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
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
  const { email, password } = validado.data;

  try {
    const [usuario] = await query<{ id: string; password_hash: string; nombre: string | null }>(
      "SELECT id::text, password_hash, nombre FROM usuarios WHERE email = $1 LIMIT 1",
      [email],
    );
    if (!usuario || !(await verifyPassword(password, usuario.password_hash))) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 },
      );
    }

    await crearSesion(usuario.id);
    return NextResponse.json({ id: usuario.id, email, nombre: usuario.nombre });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "No se pudo iniciar sesión. Intenta de nuevo más tarde." },
      { status: 500 },
    );
  }
}
