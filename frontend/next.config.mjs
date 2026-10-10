/** @type {import('next').NextConfig} */
const BACKEND = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${BACKEND}/api/:path*` }]
  },
}

export default nextConfig
