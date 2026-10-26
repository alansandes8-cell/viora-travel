import { NextResponse, type NextRequest } from "next/server";

/**
 * Primera barrera del panel: sin cookie de sesión, se redirige al login.
 * La verificación real (sesión válida en base, rol y permisos) se hace en el servidor
 * en cada página y cada acción (requireStaff).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login") && !req.cookies.get("viora_admin")) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
