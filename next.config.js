/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    }
    return config
  },
  images: {
    domains: ['lh3.googleusercontent.com'], // Google resimleri için
  },
}

module.exports = nextConfig 