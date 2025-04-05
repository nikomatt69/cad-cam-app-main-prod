// src/pages/_app.tsx
import 'src/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { AnimatePresence } from 'framer-motion';
import { ToastProvider } from 'src/contexts/ToastContext';
import PageTransition from '../components/layout/PageTransition';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NotificationProvider } from '../contexts/NotificationContext';
import SW from '../contexts/ServiceWorker';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { camFont } from 'src/lib/camFont';

import { useEffect } from 'react';
import ErrorBoundary from '../components/ui/ErrorBonduary';
import { SubscriptionProvider } from '../contexts/SubscriptionContext';
import PageViewTracker from '../components/analytics/PageViewTracker';
import usePageTracker from '../hooks/usePageTracker';
import { useActivityTracking } from '../hooks/useActivityTracking';
import { Toaster } from 'react-hot-toast';
import { AnalyticsProvider } from '../contexts/AnalyticsContext';
import ViewportMeta from '../components/layout/ViewportMeta';
import { AIContextProvider } from '../components/ai/ai-new/AIContextProvider';
import { AIAssistant } from '../components/ai/ai-new';
import { CursorProvider } from '../contexts/CursorContext';
import { PluginRegistry } from '../plugins/core/PluginRegistry';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps: { session, ...pageProps }, router }: AppProps) {

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered successfully:', registration.scope);
          })
          .catch(error => {
            console.log('Service Worker registration failed:', error);
          });
      });
    }
  }, []);

  useEffect(() => {
    const initPlugins = async () => {
      try {
        const registry = PluginRegistry.getInstance();
        await registry.initialize();
        console.log('Plugin system initialized successfully');
      } catch (error) {
        console.error('Failed to initialize plugin system:', error);
      }
    };
    
    initPlugins();
  }, []);
  
  return (
    
    <ErrorBoundary>
    <SessionProvider 
      session={session}
      >
        <AuthProvider>
          <LanguageProvider>
  
          
          <main className={`${inter.className} antialiased`}>
        
            <NotificationProvider>
              <ToastProvider>
                <AnimatePresence mode="wait">
                  <PageTransition key={router.route}>
                  <PageViewTracker />
                  <AnalyticsProvider>
                    <CursorProvider>
                  <AIContextProvider>
                  <style jsx global>{`
                     body {
                     font-family: ${camFont.style.fontFamily};
                      }
                    `}</style>
                      <ViewportMeta />
                      <Component {...pageProps} />
                     
                      </AIContextProvider>
                      </CursorProvider>
                      </AnalyticsProvider>
                    <PWAInstallPrompt />
                  </PageTransition>
                </AnimatePresence>
              </ToastProvider>
            </NotificationProvider>
       
          </main>
 
          </LanguageProvider>
        </AuthProvider>
       
    </SessionProvider>
    </ErrorBoundary>
  );
}