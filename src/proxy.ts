import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SOLICITAR_CREDENCIALES = new NextResponse("Acceso restringido", {
  status: 401,
  headers: { "WWW-Authenticate": 'Basic realm="Administración", charset="UTF-8"' },
});

function credencialValida(request: NextRequest): boolean {
  const usuario = process.env.ADMIN_USUARIO;
  const contrasena = process.env.ADMIN_CONTRASENA;
  if (!usuario || !contrasena) {
    return false;
  }
  const encabezado = request.headers.get("authorization");
  if (!encabezado?.startsWith("Basic ")) {
    return false;
  }
  const [recibidoUsuario, ...resto] = atob(encabezado.slice(6)).split(":");
  return recibidoUsuario === usuario && resto.join(":") === contrasena;
}

export function proxy(request: NextRequest) {
  if (credencialValida(request)) {
    return NextResponse.next();
  }
  return SOLICITAR_CREDENCIALES;
}

export const config = {
  matcher: ["/admin/:path*", "/api/markup"],
};
