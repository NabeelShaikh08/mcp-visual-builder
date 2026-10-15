import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  // moved from experimental in Next.js 15
  serverExternalPackages: ['@modelcontextprotocol/sdk'],
  // fix workspace root detection warning
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
