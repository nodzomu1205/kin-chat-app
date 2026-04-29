import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.102", "192.168.68.103"],
  outputFileTracingIncludes: {
    "/api/presentation-render": ["./kin-presentation-renderer/dist/**/*"],
  },
};

export default nextConfig;
