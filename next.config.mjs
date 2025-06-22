// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com", // Example from your Item.json
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com", // If you still use any
      },
      {
        protocol: "https",
        hostname: "dummyimage.com",    // For fallbacks
      },
      // Add ANY OTHER hostnames that appear in the "image" field of your Item.json
    ],
  },
};
export default nextConfig;