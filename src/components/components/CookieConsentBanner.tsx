// src/components/CookieConsentBanner.tsx
import { useAnalytics } from '@/src/contexts/AnalyticsContext';
import React, { useState, useEffect } from 'react';


export default function CookieConsentBanner() {
  const { consentGiven, setConsentGiven } = useAnalytics();
  const [visible, setVisible] = useState(false);

  // Show banner if consent hasn't been given
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!consentGiven) {
        setVisible(true);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [consentGiven]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 flex w-full bg-white shadow-lg p-4 z-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center">
        <div className="mb-4 sm:mb-0 sm:mr-4">
          <p className="text-sm text-gray-700">
            We use cookies to analyze site usage and improve your experience. By clicking &ldquo;Accept&rdquo;, you consent to our use of cookies.
          </p>
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              setConsentGiven(false);
              setVisible(false);
            }}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Decline
          </button>
          <button
            onClick={() => {
              setConsentGiven(true);
              setVisible(false);
            }}
            className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}