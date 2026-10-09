/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Force HTTPS: if a request arrives over http (x-forwarded-proto=http),
  // 308-redirect to the https URL. Prevents the http/https protocol mismatch
  // that breaks server actions / login.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
        destination: "https://app.one2infinite.com/:path*",
        permanent: true,
      },
    ];
  },
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
    // Ensure the bundled PDF fonts + the logo are traced into the serverless
    // functions that render PDFs on Vercel (otherwise fs reads fail in prod).
    outputFileTracingIncludes: {
      "/invoices/**": ["./src/lib/pdf/fonts/**", "./public/**"],
      "/payroll/**": ["./src/lib/pdf/fonts/**", "./public/**"],
      "/api/**": ["./src/lib/pdf/fonts/**", "./public/**"],
    },
  },
};

export default nextConfig;
