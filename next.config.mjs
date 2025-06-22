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
      { // Add this new pattern for Sony images
        protocol: "https",
        hostname: "www.sony.co.in",
      },
      { // Add this new pattern for Samsung images
        protocol: "https",
        hostname: "images.samsung.com",
      },
      { // Add this new pattern for Apple images
        protocol: "https",
        hostname: "www.apple.com",
      },
      { // Add this new pattern for LG images
        protocol: "https",
        hostname: "www.lg.com",
      },
      { // Add this new pattern for Xiaomi images
        protocol: "https",
        hostname: "www.mi.com",
      },
      { // Add this new pattern for OnePlus images
        protocol: "https",
        hostname: "www.oneplus.in",
      },
      { // Add this new pattern for Dell images
        protocol: "https",
        hostname: "www.dell.com",
      },
      { // Add this new pattern for HP images
        protocol: "https",
        hostname: "www.hp.com",
      },
      { // Add this new pattern for Lenovo images
        protocol: "https",
        hostname: "www.lenovo.com",
      },
      { // Add this new pattern for Asus images
        protocol: "https",
        hostname: "www.asus.com",
      },
      { // Add this new pattern for Acer images
        protocol: "https",
        hostname: "www.acer.com",
      },
      { // Add this new pattern for Tata Cliq images
        protocol: "https",
        hostname: "img.tatacliq.com",
      },
      { // Add this new pattern for Microsoft CDN images
        protocol: "https",
        hostname: "cdn-dynmedia-1.microsoft.com",
      },
      { // Add this new pattern for Xbox images
        protocol: "https",
        hostname: "cms-assets.xboxservices.com",
      },
      {
        protocol: "https",
        hostname:"motorolain.vtexassets.com",
      },
      {
        protocol: "https",
        hostname: "i1.adis.ws",
      },
      {
        protocol: "https",
        hostname:"i02.appmifile.com",
      },
      {
        protocol: "https",
        hostname: "i.dell.com"
      },
      {
        protocol: "https",
        hostname: "media.wired.com",
      },
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        hostname: "sony.scene7.com",
      },
      {
        hostname: "in.canon",
        protocol: "https",
      },
      {
        hostname: "en-uk.ring.com",
        protocol: "https",
      },
      {
        hostname:" rukminim2.flixcart.com",
        protocol: "https",
      },
      {
        protocol: "https",
        hostname: "rukminim2.flixcart.com",
      },
      {
        protocol: "https",
        hostname:"cdn.shopify.com",       
      },
      {
        protocol: "https",
        hostname: "p3-ofp.static.pub",
      }

      // Add ANY OTHER hostnames that appear in the "image" field of your Item.json
    ],
  },
};
export default nextConfig;