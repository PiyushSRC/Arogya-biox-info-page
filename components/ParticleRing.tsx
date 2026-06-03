import React, { useEffect, useRef, useCallback, memo } from 'react';
import { Particle, AppMode } from '../types';

interface ParticleRingProps {
  mode: AppMode;
}

type RBCParticle = Particle & {
  z: number;
  projectedX: number;
  projectedY: number;
  projectedZ: number;
  projectedScale: number;
  phase: number;
  pulseSpeed: number;
  colorFactor: number;
  expansion: number;
  type: 'RBC' | 'WBC';
  phi: number;
  theta: number;
  radius: number;
  rotation: { x: number, y: number, z: number };
  spinSpeed: { x: number, y: number, z: number };
};

const PALETTE = {
  BASE_BLUE: { r: 173, g: 216, b: 230 },
  RBC_RED: { r: 230, g: 30, b: 40 },
  WBC_WHITE: { r: 245, g: 245, b: 255 },
  DEEP: '#000000'
} as const;

const SPRITE_SIZE = 128;
const SPRITE_VARIETIES = 20;

function createSprites(): HTMLCanvasElement | null {
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = SPRITE_SIZE * SPRITE_VARIETIES;
  spriteCanvas.height = SPRITE_SIZE;
  const sCtx = spriteCanvas.getContext('2d');
  if (!sCtx) return null;

  for (let i = 0; i < SPRITE_VARIETIES; i++) {
    const isWBC = i >= 10;
    const centerX = i * SPRITE_SIZE + SPRITE_SIZE / 2;
    const centerY = SPRITE_SIZE / 2;
    const radius = SPRITE_SIZE * 0.45;

    sCtx.save();
    sCtx.translate(centerX, centerY);

    if (!isWBC) {
      const r = PALETTE.RBC_RED.r;
      const g = PALETTE.RBC_RED.g;
      const b = PALETTE.RBC_RED.b;

      const grad = sCtx.createRadialGradient(-radius * 0.2, -radius * 0.2, 0, 0, 0, radius);
      grad.addColorStop(0, `rgb(${Math.min(255, r + 20)}, ${Math.min(255, g + 20)}, ${Math.min(255, b + 20)})`);
      grad.addColorStop(0.6, `rgb(${r}, ${g}, ${b})`);
      grad.addColorStop(1, `rgb(${Math.max(0, r - 100)}, 0, 0)`);

      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(0, 0, radius, 0, Math.PI * 2);
      sCtx.fill();

      const centerGrad = sCtx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.65);
      centerGrad.addColorStop(0, 'rgba(0,0,0,0.6)');
      centerGrad.addColorStop(0.5, 'rgba(0,0,0,0.2)');
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = centerGrad;
      sCtx.beginPath();
      sCtx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      sCtx.fill();
    } else {
      const grad = sCtx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
      grad.addColorStop(0, 'white');
      grad.addColorStop(0.7, `rgb(220, 220, 230)`);
      grad.addColorStop(1, `rgb(160, 160, 180)`);

      sCtx.fillStyle = grad;
      sCtx.beginPath();
      sCtx.arc(0, 0, radius, 0, Math.PI * 2);
      sCtx.fill();

      const centerGrad = sCtx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.65);
      centerGrad.addColorStop(0, 'rgba(100,100,120,0.4)');
      centerGrad.addColorStop(0.6, 'rgba(150,150,170,0.1)');
      centerGrad.addColorStop(1, 'rgba(0,0,0,0)');
      sCtx.fillStyle = centerGrad;
      sCtx.beginPath();
      sCtx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
      sCtx.fill();

      sCtx.globalAlpha = 0.3;
      for (let dot = 0; dot < 12; dot++) {
        sCtx.fillStyle = 'rgba(180, 180, 220, 0.6)';
        const dotSize = radius * (0.04 + Math.random() * 0.08);
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.8;
        sCtx.beginPath();
        sCtx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, dotSize, 0, Math.PI * 2);
        sCtx.fill();
      }
      sCtx.globalAlpha = 1.0;
    }

    sCtx.restore();
  }
  return spriteCanvas;
}

function getParticleCount(width: number): number {
  if (width < 768) return 120;
  if (width < 1024) return 500;
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return 600;
  if (cores <= 4) return 1200;
  return 1800;
}

const ParticleRing: React.FC<ParticleRingProps> = ({ mode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });
  const particles = useRef<RBCParticle[]>([]);
  const animationFrameId = useRef<number | undefined>(undefined);
  const heartPhase = useRef(0);
  const sortCounter = useRef(0);
  const isVisible = useRef(true);

  const rotationRef = useRef({
    x: 0,
    y: 0,
    z: 0
  });

  const prevWidth = useRef<number>(0);
  const prevHeight = useRef<number>(0);
  const cachedRect = useRef<DOMRect | null>(null);
  const lastDrawTime = useRef<number>(0);

  const initParticles = useCallback((width: number, height: number) => {
    const isDesktop = width >= 1024;
    const isMobile = width < 768;

    const count = getParticleCount(width);

    const tempParticles: RBCParticle[] = [];
    const sphereRadius = Math.min(width, height) * (isDesktop ? 0.42 : isMobile ? 0.32 : 0.38);

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;
      const r = (0.7 + Math.random() * 0.3) * sphereRadius;

      const isWBC = Math.random() > 0.95;
      const sizeMultiplier = isMobile ? 1.2 : 1.0;
      const baseSize = (isWBC ? (16 + Math.random() * 8) : (11 + Math.random() * 9)) * sizeMultiplier;

      tempParticles.push({
        x: 0, y: 0, z: 0,
        originX: 0, originY: 0,
        projectedX: 0, projectedY: 0, projectedZ: 0, projectedScale: 1,
        size: baseSize,
        baseSize: baseSize,
        color: '',
        targetColor: '',
        angle: 0,
        distance: 0,
        speed: 0,
        vx: 0, vy: 0,
        friction: 0.94,
        ease: 0.04,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        colorFactor: 0,
        expansion: 0,
        type: isWBC ? 'WBC' : 'RBC',
        phi: phi,
        theta: theta,
        radius: r,
        rotation: {
          x: Math.random() * Math.PI,
          y: Math.random() * Math.PI,
          z: Math.random() * Math.PI
        },
        spinSpeed: {
          x: (Math.random() - 0.5) * 0.012,
          y: (Math.random() - 0.5) * 0.012,
          z: (Math.random() - 0.5) * 0.012
        }
      });
    }
    particles.current = tempParticles;
    if (!spriteCanvasRef.current) {
      spriteCanvasRef.current = createSprites();
    }
  }, []);

  // Renders a single frame (no scheduling). Reused by the animation loop and
  // for the one-off static frame drawn when prefers-reduced-motion is enabled,
  // so the visual is always painted instead of leaving a blank canvas.
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteCanvasRef.current) return;

    // Skip drawing if canvas has zero dimensions
    if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const isMobile = canvas.width < 768;

    ctx.fillStyle = PALETTE.DEEP;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const isDesktop = canvas.width >= 1024;
    const centerX = isDesktop ? canvas.width * 0.72 : canvas.width * 0.5;
    const centerY = isDesktop ? canvas.height * 0.45 : canvas.height * 0.42;

    rotationRef.current.y += isMobile ? 0.0004 : 0.0006;
    rotationRef.current.x += isMobile ? 0.0001 : 0.0002;

    heartPhase.current += 0.012;
    const pulseScale = 1 + Math.pow(Math.sin(heartPhase.current), 4) * 0.015;

    const perspective = 1200;
    const cosY = Math.cos(rotationRef.current.y);
    const sinY = Math.sin(rotationRef.current.y);
    const cosX = Math.cos(rotationRef.current.x);
    const sinX = Math.sin(rotationRef.current.x);

    if (!cachedRect.current) {
      cachedRect.current = canvas.getBoundingClientRect();
    }
    const rect = cachedRect.current;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const relX = (mouseRef.current.x - rect.left) * scaleX;
    const relY = (mouseRef.current.y - rect.top) * scaleY;

    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      p.rotation.x += p.spinSpeed.x;
      p.rotation.y += p.spinSpeed.y;
      p.rotation.z += p.spinSpeed.z;

      const baseR = p.radius * pulseScale;
      const curX = baseR * Math.sin(p.phi) * Math.cos(p.theta);
      const curY = baseR * Math.sin(p.phi) * Math.sin(p.theta);
      const curZ = baseR * Math.cos(p.phi);

      let x1 = curX * cosY - curZ * sinY;
      let z1 = curX * sinY + curZ * cosY;
      let y2 = curY * cosX - z1 * sinX;
      let z2 = curY * sinX + z1 * cosX;

      const scale = perspective / (perspective + z2);
      p.projectedX = centerX + x1 * scale;
      p.projectedY = centerY + y2 * scale;
      p.projectedZ = z2;
      p.projectedScale = scale;

      // Skip expensive per-particle interaction on mobile unless actively touching
      if (!isMobile || mouseRef.current.active) {
        const dx = relX - p.projectedX;
        const dy = relY - p.projectedY;
        if (Math.abs(dx) < 120 && Math.abs(dy) < 120) {
          const distSq = dx * dx + dy * dy;
          if (distSq < 14400) {
            const force = (120 - Math.sqrt(distSq)) / 120;
            p.expansion += (force * 22 - p.expansion) * 0.15;
          } else {
            p.expansion *= 0.9;
          }
        } else {
          p.expansion *= 0.9;
        }
      } else {
        p.expansion *= 0.9;
      }
    }

    // Sort less often on mobile (every 12 frames) vs desktop (every 6)
    sortCounter.current++;
    const sortInterval = isMobile ? 12 : 6;
    if (sortCounter.current >= sortInterval) {
      particles.current.sort((a, b) => b.projectedZ - a.projectedZ);
      sortCounter.current = 0;
    }

    for (let i = 0; i < particles.current.length; i++) {
      const p = particles.current[i];
      const finalSize = (p.baseSize + p.expansion) * p.projectedScale;
      const isWBC = p.type === 'WBC';
      const spriteIdx = isWBC ? 10 + (i % 10) : (i % 10);
      const depthOpacity = Math.max(0.15, 0.6 + (p.projectedZ / 1000) * -0.5);

      const diskX = Math.max(0.3, Math.abs(Math.cos(p.rotation.x)));
      const diskY = Math.max(0.2, Math.abs(Math.sin(p.rotation.y)));
      const rotZ = p.rotation.z;

      const m11 = diskX * Math.cos(rotZ);
      const m12 = diskX * Math.sin(rotZ);
      const m21 = -diskY * Math.sin(rotZ);
      const m22 = diskY * Math.cos(rotZ);

      ctx.globalAlpha = depthOpacity;
      ctx.setTransform(m11, m12, m21, m22, p.projectedX, p.projectedY);

      ctx.drawImage(
        spriteCanvasRef.current,
        spriteIdx * SPRITE_SIZE, 0, SPRITE_SIZE, SPRITE_SIZE,
        -finalSize, -finalSize, finalSize * 2, finalSize * 2
      );
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, []);

  const draw = useCallback((timestamp: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas || !spriteCanvasRef.current) return;

    // Pause animation when scrolled out of viewport
    if (!isVisible.current) {
      animationFrameId.current = requestAnimationFrame(draw);
      return;
    }

    // Skip drawing if canvas has zero dimensions
    if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
      animationFrameId.current = requestAnimationFrame(draw);
      return;
    }

    // FPS Throttling: ~30fps on mobile, ~45fps on tablets
    const isMobile = canvas.width < 768;
    const elapsed = timestamp - lastDrawTime.current;
    const targetInterval = isMobile ? 32 : (canvas.width < 1024 ? 22 : 0);
    if (targetInterval > 0 && elapsed < targetInterval) {
      animationFrameId.current = requestAnimationFrame(draw);
      return;
    }
    lastDrawTime.current = timestamp;

    renderFrame();
    animationFrameId.current = requestAnimationFrame(draw);
  }, [renderFrame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Start the animation loop, or — when reduced motion is preferred — paint a
    // single static frame. Either way the torus is always visible (never blank).
    const start = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = undefined;
      }
      if (motionQuery.matches) {
        renderFrame();
      } else {
        draw();
      }
    };

    // Size the canvas to its parent and (re)build particles. Guards against a
    // zero-sized parent (layout not settled yet) so init isn't silently skipped,
    // and re-inits on real width OR height changes.
    const sizeAndInit = () => {
      const newWidth = parent.clientWidth;
      const newHeight = parent.clientHeight;
      if (newWidth === 0 || newHeight === 0) return;
      if (newWidth === prevWidth.current && newHeight === prevHeight.current) return;

      prevWidth.current = newWidth;
      prevHeight.current = newHeight;

      const isMobile = newWidth < 768;
      const pixelRatio = isMobile ? Math.min(1.5, window.devicePixelRatio) : window.devicePixelRatio;

      canvas.width = newWidth * pixelRatio;
      canvas.height = newHeight * pixelRatio;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
      cachedRect.current = canvas.getBoundingClientRect();

      particles.current = [];
      initParticles(newWidth, newHeight);

      start();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, active: true };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, active: true };
      }
    };

    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    // Re-init on container size changes (width AND height, plus the first
    // non-zero layout) instead of relying solely on window 'resize'.
    const resizeObserver = new ResizeObserver(() => sizeAndInit());
    resizeObserver.observe(parent);

    // Pause animation when canvas is not in viewport (saves CPU/battery on scroll)
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => { isVisible.current = entry.isIntersecting; },
      { threshold: 0 }
    );
    visibilityObserver.observe(canvas);

    // React to the user toggling the OS "reduce motion" setting at runtime.
    const handleMotionChange = () => start();
    motionQuery.addEventListener('change', handleMotionChange);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Initial sizing in case layout is already settled (ResizeObserver also
    // fires once on observe; the size guard prevents a duplicate init).
    sizeAndInit();
    // Ensure a render is running even if sizeAndInit short-circuited because the
    // dimensions were unchanged (e.g. a StrictMode remount reusing the sized
    // canvas) — otherwise the loop would never (re)start.
    start();

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      motionQuery.removeEventListener('change', handleMotionChange);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [initParticles, draw, renderFrame]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-10 w-full h-full"
    />
  );
};

export default memo(ParticleRing);