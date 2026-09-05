// Extracts the public origin from reverse proxy headers (X-Forwarded-Host, Host), falling back to request.url origin.
export function getRequestOrigin(
  request: Request,
  publicAppUrl?: string | null,
): string {
  if (publicAppUrl) {
    return publicAppUrl.replace(/\/+$/, "");
  }
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`;
  }
  return new URL(request.url).origin;
}
