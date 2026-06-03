import React, { useCallback, Suspense } from 'react';
import { scrollTo } from '../utils/scroll';
import { lazyWithRetry } from '../utils/lazyWithRetry';

const MobileParticleThree = lazyWithRetry(() => import('./MobileParticleThree'));

const Hero: React.FC = () => {
  const handleContactClick = useCallback(() => scrollTo('contact'), []);
  const handleDemoClick = useCallback(() => { window.location.href = '/demo'; }, []);

  return (
    <div className="relative z-20 min-h-screen flex flex-col items-center px-6 md:px-12 lg:px-24 pt-4 md:pt-10 pb-20 md:pb-40 justify-start md:justify-center">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center gap-12 lg:gap-20">
        <div className="w-full flex flex-col items-center text-center group/hero-text">
          <h1
            className="text-4xl sm:text-5xl lg:text-display-1 font-heading font-light leading-[1.1] lg:leading-[1] mb-6 md:mb-10 tracking-tight text-white cursor-default"
          >
            <span className="inline-block transition-[color,filter] duration-700 group-hover/hero-text:text-blue-400 group-hover/hero-text:drop-shadow-[0_0_25px_rgba(96,165,250,0.4)] will-change-[filter] transform-gpu">
              Clinical Intelligence
            </span> <br />
            <span className="font-medium inline-block transition-[color,transform] duration-700 group-hover/hero-text:text-blue-200 group-hover/hero-text:translate-x-1 will-change-transform transform-gpu">
              at Population Scale
            </span>
          </h1>

          <p className="text-white/80 hover:text-white transition-colors duration-500 font-body text-body-1 leading-relaxed mb-6 md:mb-10 max-w-2xl">
            Arogya BioX builds software-driven screening and clinical intelligence platforms that extract actionable insights from routine diagnostic data enabling earlier risk identification without adding operational complexity.
          </p>

          {/* Mobile particle animation — rendered inline in the flow so it never overlaps buttons */}
          <div className="md:hidden w-full h-[300px] sm:h-[340px] max-h-[55vh] relative overflow-hidden my-6">
            <Suspense fallback={null}>
              <MobileParticleThree />
            </Suspense>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto mt-6 md:mt-0">
            <button
              onClick={handleDemoClick}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-cta-md font-bold tracking-widest uppercase transition-colors shadow-lg hover:shadow-blue-500/50 active:scale-95 text-center font-heading"
            >
              Request a Demo
            </button>
            <button
              onClick={handleContactClick}
              className="px-8 py-4 border border-white/20 hover:bg-white/5 text-white/90 hover:text-white rounded-full text-cta-md font-bold tracking-widest uppercase transition-colors text-center font-heading"
            >
              Contact Sales
            </button>
          </div>

          <p className="mt-12 text-small-label text-white/75 uppercase tracking-[0.3em] font-medium hidden md:block font-heading">
            Built for laboratories. Designed for clinicians.
          </p>
        </div>

      </div>
    </div>
  );
};

export default React.memo(Hero);