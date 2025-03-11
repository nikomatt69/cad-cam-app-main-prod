// src/components/SEO.tsx
import Head from 'next/head'
import { useRouter } from 'next/router'

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
}

export default function SEO({ 
  title = 'Default Title',
  description = 'Default description of your website',
  image = 'https://cadcamfun.xyz/logo.png',
  type = 'website'
}: SEOProps) {
  const router = useRouter()
  const url = `https://cadcamfun.xyz${router.asPath}`
  
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph tags */}
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Head>
  )
}