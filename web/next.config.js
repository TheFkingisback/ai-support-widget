/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: require('node:path').join(__dirname, '..'),
  async redirects() {
    return [{ source: '/integration-v3/INICIAR.html', destination: '/developers', permanent: false }, { source: '/devcenter', destination: '/developers', permanent: false }, { source: '/docs', destination: '/developers', permanent: false }];
  },
};
module.exports = nextConfig;
