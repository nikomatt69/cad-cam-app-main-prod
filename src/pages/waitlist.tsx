import React from 'react';
import SimpleWaitlist from '@/src/components/components/SimpleWaitlist';
import { FEATURES } from '@/src/config/features';

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-8">
        CADCAMFUN
      </h1>
      
      {/* Contenuto principale della pagina */}
      <div className="prose max-w-none mx-auto dark:prose-invert">
        <p>
        CADCAMFUN è un sistema CAD/CAM per la produzione di componenti 3D.
        </p>
      </div>
      
      {/* Waitlist (mostra solo se abilitata) */}
      {FEATURES.WAITLIST_ENABLED && (
        <div className="mt-12">
          <SimpleWaitlist />
        </div>
      )}
    </div>
  );
}