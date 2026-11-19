import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma client is created lazily (lib/prisma.ts) so builds succeed
  // with no DATABASE_URL configured.
};

export default nextConfig;
