import { NextResponse } from "next/server";
import { sabreFetch } from "@/lib/sabre";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const { mode = "flightShop", body } = (await request.json()) as {
    mode?: string;
    body?: unknown;
  };
  const ruta = `/v1/offers/${mode}`;
  try {
    const data = await sabreFetch<unknown>(ruta, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
    return NextResponse.json({ ok: true, ruta, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, ruta, error: (error as Error).message },
      { status: 502 },
    );
  }
}
