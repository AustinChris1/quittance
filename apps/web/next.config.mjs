import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // This app lives in a pnpm workspace and imports the core from outside its own root.
  outputFileTracingRoot: join(here, "..", ".."),
  // The core imports its own modules with explicit .ts specifiers.
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
