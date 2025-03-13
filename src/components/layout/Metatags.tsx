// src/components/common/MetaTags.tsx

import Head from 'next/head';
import { useRouter } from 'next/router';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  noindex?: boolean;
  canonicalUrl?: string;
}

export default function MetaTags({
  title = 'CAD/CAM FUN',
  description = 'Modern CAD/CAM system for 2D/3D design and CNC machining with AI capabilities',
  keywords = 'CAD, CAM, CNC, design, machining, 3D modeling, manufacturing',
  ogImage = '/logo.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  noindex = false,
  canonicalUrl,
}: MetaTagsProps) {
  const router = useRouter();
  const siteUrl = process.env.NEXTAUTH_URL ;
  const currentPath = router.asPath;
  const fullUrl = canonicalUrl || `${siteUrl}${currentPath}`;
  const fullTitle = `${title}${title === 'CAD/CAM FUN' ? '' : ' | CAD/CAM FUN'}`;

  return (
    <Head>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="viewport" content="width=device-width, initial-scale=0.8, maximum-scale=1" />
    
      {/* Canonical Link */}
      <link rel="canonical" href={fullUrl} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:image" content={`${siteUrl}${ogImage}`} />
      <meta property="og:site_name" content="CAD/CAM FUN" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${ogImage}`} />
      
      {/* Robots Meta Tag */}
      {noindex && <meta name="robots" content="noindex,nofollow" />}
      
      {/* Favicon */}
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" href="/icon.png" type="image/png" />
      <link rel="apple-touch-icon" href="/icon.png" />
      
      {/* PWA related */}
      <meta name="theme-color" content="#000" />
      <link rel="manifest" href="/manifest.json" />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    </Head>
  );
}