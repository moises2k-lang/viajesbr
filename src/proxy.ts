import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxy as verificarProxy } from "@/lib/proxy";

export default function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const protegido =
    path.startsWith("/admin") ||
    path === "/api/markup" ||
    path.startsWith("/api/documentos");

  if (protegido) {
    return verificarProxy(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/markup", "/api/documentos/:path*"],
};
