import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// CSP is set per-request in proxy.ts instead, since it needs a fresh nonce every response.

// No HSTS here: this runs self-hosted, sometimes over plain HTTP on a LAN - add it at the reverse proxy once TLS is in front.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

// Hosts allowed to reach dev-only Next.js resources (HMR etc), needed when reaching the dev server through a domain/tunnel.
const trustedDomains =
  process.env.TRUSTED_DOMAIN?.split(",")
    .map((domain) => domain.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  allowedDevOrigins: trustedDomains,
  agentRules: false,  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default withNextIntl(nextConfig);
