import React, { Suspense, useState, useEffect } from 'react';
import { AppMode } from '../types';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const ParticleRing = lazyWithRetry(() => import('./ParticleRing'));

interface ParticleRendererProps {
  mode: AppMode;
}

function useIsMobile(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => window.innerWidth < 768;
    setIsMobile(check());

    const handleResize = () => setIsMobile(check());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

const fallback = (
  <div className="absolute inset-0 z-10 bg-gradient-to-br from-black via-blue-950/20 to-black" />
);

const ParticleRenderer: React.FC<ParticleRendererProps> = ({ mode }) => {
  const isMobile = useIsMobile();

  // Don't render until we know the device type
  if (isMobile === null) return fallback;

  // Mobile particles are rendered inline by Hero.tsx to prevent layout overlap
  if (isMobile) return null;

  return (
    <Suspense fallback={fallback}>
      <ParticleRing mode={mode} />
    </Suspense>
  );
};

export default React.memo(ParticleRenderer);
