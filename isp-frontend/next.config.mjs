/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:3000/api/v1/:path*',
      },
      {
        source: '/api/auth/:path*',
        destination: 'http://localhost:3000/api/auth/:path*',
      },
      {
        source: '/api/superadmin/:path*',
        destination: 'http://localhost:3000/api/superadmin/:path*',
      },
      {
        source: '/health',
        destination: 'http://localhost:3000/health',
      },
    ];
  },
};

export default nextConfig;
