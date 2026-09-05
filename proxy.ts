import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Web Crypto, not node:crypto: this runs in the Edge Runtime, which only has globalThis.crypto.
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export const CSRF_COOKIE_NAME = "csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Login/register/sync/oauth-token are excluded: the Flutter app hits these directly with no browser and no CSRF cookie to have.
const CSRF_EXEMPT_PATHS = new Set([
  "/api/login",
  "/api/register",
  "/api/sync/v1",
  "/api/oauth/token",
]);

// Generated fresh per request; Next reads it back out of the CSP header below to stamp onto its own hydration scripts.
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// 'strict-dynamic' + nonce trusts Next's own chunked bootstrap while still blocking unauthorized inline scripts.
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline'${
      process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""
    }`,
    // No nonce here on purpose: a nonce in this directive makes browsers ignore 'unsafe-inline', breaking React/Tailwind's inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    MUTATING_METHODS.has(request.method) &&
    !CSRF_EXEMPT_PATHS.has(pathname)
  ) {
    const headerToken = request.headers.get(CSRF_HEADER_NAME);
    if (!existingToken || !headerToken || headerToken !== existingToken) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 },
      );
    }
  }

  const nonce = generateNonce();
  const csp = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next reads the nonce back out of THIS request header, not the response - response-only would leave its own bootstrap script blocked.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // Skipped in dev, HSTS breaks plain-http localhost.
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "same-origin");

  if (!existingToken) {
    response.cookies.set(CSRF_COOKIE_NAME, generateToken(), {
      // Must be readable by client JS to echo back as the header - protection comes from cross-origin read isolation, not secrecy.
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export const config = {
  matcher: "/:path*",
};
