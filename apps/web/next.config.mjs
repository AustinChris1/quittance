/** @type {import("next").NextConfig} */
const nextConfig = {
  // The core imports its own modules with explicit .ts specifiers.
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    return config;
  },
};

export default nextConfig;
