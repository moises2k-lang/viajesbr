"use server";

import { randomUUID, randomBytes } from "crypto";
import { query } from "@/lib/db";

export interface CaptchaToken {
  id: string;
  token: string;
}

export async function crearCaptcha(): Promise<CaptchaToken> {
  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const [fila] = await query<{ id: string }>(
    `INSERT INTO captcha_challenges (id, respuesta) VALUES ($1, $2) RETURNING id`,
    [id, token],
  );
  if (!fila) throw new Error("No se pudo crear el token de verificación");
  return { id: fila.id, token };
}

export async function verificarCaptcha(
  id: string | undefined,
  respuesta: string | undefined,
): Promise<boolean> {
  if (!id || typeof respuesta !== "string") return false;
  const [fila] = await query<{ id: string }>(
    `UPDATE captcha_challenges
        SET usado = true
      WHERE id = $1
        AND usado = false
        AND expira_en > now()
        AND respuesta = $2
      RETURNING id`,
    [id, respuesta.trim()],
  );
  return !!fila;
}
