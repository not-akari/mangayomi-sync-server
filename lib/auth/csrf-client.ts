"use client";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

function readCsrfToken(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_COOKIE_NAME}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

// Wraps fetch for same-origin mutations: attaches the double-submit CSRF header read from the cookie proxy.ts sets.
export function apiFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = readCsrfToken();
  const headers = new Headers(init.headers);
  if (token) headers.set(CSRF_HEADER_NAME, token);
  return fetch(input, { ...init, headers });
}
