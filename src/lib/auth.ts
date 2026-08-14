"use server";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

const SESION_DIAS = 30;
const HASH_LEN = 64;

export interface Usuario {
  id: string;
  email: string;
  nombre: string | null;
}

function expiracion() {
  const ahora = new Date();
  ahora.setDate(ahora.getDate() + SESION_DIAS);
  return ahora;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, HASH_LEN).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, original] = hash.split(":");
  if (!salt || !original) return false;
  const derivado = scryptSync(password, salt, HASH_LEN);
  const originalBuf = Buffer.from(original, "hex");
  if (derivado.length !== originalBuf.length) return false;
  return timingSafeEqual(derivado, originalBuf);
}

export async function crearSesion(usuarioId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO sesiones (id, expira_en, usuario_id) VALUES ($1, $2, $3)`,
    [token, expiracion(), usuarioId],
  );
  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiracion(),
  });
  return token;
}

export async function borrarSesion(): Promise<void> {
  const token = (await cookies()).get("session")?.value;
  if (token) {
    await query("DELETE FROM sesiones WHERE id = $1", [token]);
  }
  (await cookies()).delete("session");
}

export async function usuarioDeSesion(): Promise<Usuario | null> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;
  const [usuario] = await query<Usuario & Record<string, unknown>>(
    `SELECT u.id::text, u.email, u.nombre
       FROM sesiones s
       JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.id = $1 AND s.expira_en > now()`,
    [token],
  );
  if (!usuario) {
    (await cookies()).delete("session");
    return null;
  }
  return { id: usuario.id, email: usuario.email, nombre: usuario.nombre };
}

export async function renovarSesion(): Promise<void> {
  const token = (await cookies()).get("session")?.value;
  if (!token) return;
  await query("UPDATE sesiones SET expira_en = $2 WHERE id = $1", [
    token,
    expiracion(),
  ]);
  (await cookies()).set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiracion(),
  });
}
