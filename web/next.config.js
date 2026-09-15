/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [{ source: '/developers/:path*', destination: '/integration-v3/INICIAR.html', permanent: false }];
  },
};
module.exports = nextConfig;
