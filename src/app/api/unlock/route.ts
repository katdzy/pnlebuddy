import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, GATE_MAX_AGE, gateToken, safeNext, sameString, sitePassword } from "@/lib/gate";

/** Checks the password from the unlock form and sets the gate cookie. */
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const given = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? "/"));
  const password = sitePassword();

  if (!password || !sameString(await gateToken(given), await gateToken(password))) {
    const back = new URL("/unlock", request.url);
    back.searchParams.set("next", next);
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }

  const res = NextResponse.redirect(new URL(next, request.url), 303);
  res.cookies.set(GATE_COOKIE, await gateToken(password), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: GATE_MAX_AGE,
  });
  return res;
}
