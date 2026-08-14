import { NextResponse } from "next/server";
import { borrarSesion } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  await borrarSesion();
  return NextResponse.json({ ok: true });
}
