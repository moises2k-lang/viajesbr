"use server";

import { randomUUID } from "crypto";
import { query } from "@/lib/db";

export interface Captcha {
  id: string;
  pregunta: string;
}

function operacion(): { a: number; b: number; respuesta: string; pregunta: string } {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return {
    a,
    b,
    respuesta: String(a + b),
    pregunta: `${a} + ${b}`,
  };
}

export async function crearCaptcha(): Promise<Captcha> {
  const { respuesta, pregunta } = operacion();
  const id = randomUUID();
  const [fila] = await query<{ id: string }>(
    `INSERT INTO captcha_challenges (id, respuesta) VALUES ($1, $2) RETURNING id`,
    [id, respuesta],
  );
  if (!fila) throw new Error("No se pudo crear el captcha");
  return { id: fila.id, pregunta };
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
