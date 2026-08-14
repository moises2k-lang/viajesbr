import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const usuario = await usuarioDeSesion();
  return NextResponse.json({ usuario });
}
