/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Security headers applied to every response. HTTPS is terminated by Vercel.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
  // @react-pdf/renderer and argon2 are server-only native/heavy deps.
  // Next.js 14 uses experimental.serverComponentsExternalPackages
  // (renamed to top-level serverExternalPackages in Next 15).
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer", "argon2"],
  },
};

export default nextConfig;
