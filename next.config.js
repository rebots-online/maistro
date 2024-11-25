/** @type {import('next').NextConfig} */

const nextConfig = {
  output: 'standalone', // Enables static exports and containerization
  experimental: {
    serverActions: true,
  },
  images: {
    domains: [
      'localhost',
      'app.robin.bio',
      // Add other domains as needed
    ],
  },
  // Enable WebAssembly
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    }
    
    // Add support for MIDI files
    config.module.rules.push({
      test: /\.(mid|midi)$/,
      use: 'file-loader',
    })

    return config
  },
}

module.exports = nextConfig
