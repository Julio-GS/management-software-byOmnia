/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable static export for Electron builds only
  output: process.env.BUILD_MODE === 'electron' ? 'export' : undefined,
  // Disable image optimization for static export
  ...(process.env.BUILD_MODE === 'electron' && {
    images: {
      unoptimized: true,
    },
  }),
  // Optimize build performance for Railway (reduces memory usage)
  experimental: {
    // Reduce memory usage during build by limiting worker threads
    workerThreads: false,
    cpus: 1,
  },
  // Disable source maps in production to reduce memory during build
  productionBrowserSourceMaps: false,
}

export default nextConfig
