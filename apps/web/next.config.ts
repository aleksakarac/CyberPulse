import type { NextConfig } from 'next'
import { resolve } from 'path'

const nextConfig: NextConfig = {
  transpilePackages: ['@cyberpulse/shared'],
  outputFileTracingRoot: resolve(import.meta.dirname, '../../'),
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      type: 'asset/source',
    })
    return config
  },
}

export default nextConfig
