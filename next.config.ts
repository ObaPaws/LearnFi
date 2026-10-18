import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "header", key: "mux-signature" }],
          destination: "/api/mux/webhook",
        },
      ],
    };
  },
};
export default nextConfig;
