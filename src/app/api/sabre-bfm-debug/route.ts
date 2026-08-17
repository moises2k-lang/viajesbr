import { NextResponse } from "next/server";
import { sabreFetch } from "@/lib/sabre";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json();
  const data = await sabreFetch("/v5/offers/shop", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return NextResponse.json(data);
}
