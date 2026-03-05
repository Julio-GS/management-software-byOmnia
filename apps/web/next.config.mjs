/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable static export for Electron builds
  output: process.env.BUILD_MODE === 'electron' ? 'export' : undefined,
  // Disable image optimization for static export
  ...(process.env.BUILD_MODE === 'electron' && {
    images: {
      unoptimized: true,
    },
  }),
}

export default nextConfig
