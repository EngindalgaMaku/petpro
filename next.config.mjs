/** @type {import('next').NextConfig} */
const nextConfig = {
  // Coolify runs `npm start`; the standalone output is not used
  poweredByHeader: false,
  images: { unoptimized: true },
  // Sign-in moved to the site root; old bookmarks still work
  async redirects() {
    return [{ source: "/giris", destination: "/", permanent: true }];
  },
};

export default nextConfig;
