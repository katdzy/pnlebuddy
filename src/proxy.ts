import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken, sameString, sitePassword } from "@/lib/gate";

/** Paths reachable without the password: the unlock screen itself. */
const OPEN = ["/unlock", "/api/unlock"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const password = sitePassword();

  if (!password) {
    // Local development runs open; a deployment without a password stays closed.
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("PNLE Buddy is locked: set SITE_PASSWORD in the hosting environment.", { status: 503 });
  }
  if (OPEN.includes(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(GATE_COOKIE)?.value;
  if (cookie && sameString(cookie, await gateToken(password))) return NextResponse.next();

  const wantsPage = request.method === "GET" && (request.headers.get("accept") ?? "").includes("text/html");
  if (wantsPage) {
    const url = new URL("/unlock", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }
  return new NextResponse("Locked", { status: 401, headers: { "Cache-Control": "no-store" } });
}

export const config = {
  matcher: [
    // Everything except build assets (code only) and the app icons/manifest the Home Screen needs.
    "/((?!_next/static|_next/image|icons/|apple-icon|icon\\.svg|manifest\\.webmanifest|favicon).*)",
  ],
};
