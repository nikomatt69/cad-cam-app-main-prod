import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

import { useAIAssistantStore } from '../store/aiAssistantStore';
import AIAssistantPanel from './AIAssistantPanel';
import AIAssistantFloating from '../components/ai/AIAssistantFloating';

const AIAssistantProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const router = useRouter();
  const { setMode } = useAIAssistantStore();

  useEffect(() => {
    const path = router.pathname;
    if (path.includes('/cad')) {
      setMode('cad');
    } else if (path.includes('/cam')) {
      setMode('cam');
    } else if (path.includes('/gcode')) {
      setMode('gcode');
    } else if (path.includes('/toolpath')) {
      setMode('toolpath');
    } else {
      setMode('general');
    }
  }, [router.pathname, setMode]);

  return (
    <>
      {children}
      <AIAssistantFloating />
      <AIAssistantPanel />
    </>
  );
};

export default AIAssistantProvider;