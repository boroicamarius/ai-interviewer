/** @type {import('next').NextConfig} */
const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // Same-origin proxy for the API. Keeps the browser free of CORS setup and
    // lets Docker use the internal service name (http://api:8000).
    return [
      {
        source: "/backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
      // Keep the interactive FastAPI docs working behind the same proxy.
      { source: "/docs", destination: `${backendUrl}/docs` },
      { source: "/redoc", destination: `${backendUrl}/redoc` },
      { source: "/openapi.json", destination: `${backendUrl}/openapi.json` },
      // Swagger UI "Try it out" calls /api/v1/* at the current origin.
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
    ];
  },
};

export default nextConfig;
