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
    ], // Domini consentiti per il caricamento delle immagini
  },
  
  // Abilita l'utilizzo dell'attributo script-src nella policy di Content Security
  'script-src': false,
 
  // Configurazione di webpack per Next.js
  webpack: (config) => {
    // Imposta il fallback di risoluzione dei moduli per il modulo fs su false
    config.resolve.fallback = { fs: false };
    return config;
  },
  async headers() {
    return [
      {
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
        source: '/(.*)'
      }
    ];
  }
};

// Esporta la configurazione per l'utilizzo da parte di Next.js
module.exports = nextConfig;