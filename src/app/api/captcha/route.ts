import { NextResponse } from "next/server";
import { crearCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";

export async function GET() {
  try {
    const captcha = await crearCaptcha();
    return NextResponse.json(captcha);
  } catch (error) {
    console.error("Error creando captcha:", error);
    return NextResponse.json(
      { error: "No se pudo generar la verificación" },
      { status: 500 },
    );
  }
}
