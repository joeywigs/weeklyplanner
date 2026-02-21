/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/weeklyplanner',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
