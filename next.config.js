/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Empty turbopack config to silence the warning
  // PWA functionality is handled by the manifest.json and our custom service worker
  turbopack: {},
}

module.exports = nextConfig;
