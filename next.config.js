
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});


/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Abilita la modalità strict di React per controlli aggiuntivi

  
  // Configurazione per le API di Next.js
 
  
  // Configurazione per l'ottimizzazione delle immagini
  images: {
    domains: [
      'localhost',
      'vercel.app',
      'cadcamfun.xyz',
      'endpoint.4everland.co',
      'cadcamfun.xyz/api/*',
      'cadcamfun.xyz/api/websocket',
      'cadcamfun.xyz/favicon.ico',
      'cadcamfun.xyz/icon.png',
    ], // Domini consentiti per il caricamento delle immagini
  },
  
  // Abilita l'utilizzo dell'attributo script-src nella policy di Content Security
  
 
  // Configurazione di webpack per Next.js
  webpack: (config) => {
    // Imposta il fallback di risoluzione dei moduli per il modulo fs su false
    config.resolve.fallback = { fs: false ,tls: false,net: false};
    return config;
  },

  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots',
      },
      {
        source: '/og-image/:path*',
        destination: '/api/og-image/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
        source: '/(.*)'
      }
    ];
  }
};

// Esporta la configurazione per l'utilizzo da parte di Next.js
module.exports = withBundleAnalyzer(nextConfig);