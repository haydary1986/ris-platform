'use client';

import { useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function Hero() {
  const t = useTranslations('landing.hero');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLElement>(null);

  const dots = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: seededRandom(i * 7) * 100,
        y: seededRandom(i * 13) * 100,
        baseSize: 1.5 + seededRandom(i * 19) * 2,
        speed: 0.1 + seededRandom(i * 31) * 0.3,
      })),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;

    function resize() {
      w = section!.clientWidth;
      h = section!.clientHeight;
      canvas!.width = w * window.devicePixelRatio;
      canvas!.height = h * window.devicePixelRatio;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = section!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    resize();
    window.addEventListener('resize', resize);
    section.addEventListener('mousemove', handleMouseMove);

    // Globe parameters
    let globeRotation = 0;
    const globeCenterX = () => w * 0.78;
    const globeCenterY = () => h * 0.5;
    const globeRadius = () => Math.min(w, h) * 0.3;

    // Globe points (lat/lng grid)
    const globePoints: Array<{ lat: number; lng: number }> = [];
    for (let lat = -80; lat <= 80; lat += 12) {
      for (let lng = 0; lng < 360; lng += 12) {
        globePoints.push({ lat: (lat * Math.PI) / 180, lng: (lng * Math.PI) / 180 });
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const isDark = document.documentElement.classList.contains('dark');
      const dotColor = isDark ? 'rgba(148, 163, 184,' : 'rgba(100, 116, 139,';
      const lineColor = isDark ? 'rgba(148, 163, 184,' : 'rgba(100, 116, 139,';
      const globeColor = isDark ? 'rgba(56, 189, 248,' : 'rgba(14, 165, 233,';

      // === Interactive dots (Antigravity style) ===
      for (const dot of dots) {
        const dx = (dot.x / 100) * w;
        const dy = (dot.y / 100) * h;
        const distToMouse = Math.sqrt((dx - mx) ** 2 + (dy - my) ** 2);
        const influence = Math.max(0, 1 - distToMouse / 180);
        const size = dot.baseSize + influence * 4;
        const alpha = 0.15 + influence * 0.6;

        ctx!.beginPath();
        ctx!.arc(dx, dy, size, 0, Math.PI * 2);
        ctx!.fillStyle = `${dotColor}${alpha})`;
        ctx!.fill();

        // Connect nearby dots to mouse
        if (distToMouse < 150) {
          ctx!.beginPath();
          ctx!.moveTo(dx, dy);
          ctx!.lineTo(mx, my);
          ctx!.strokeStyle = `${lineColor}${influence * 0.3})`;
          ctx!.lineWidth = 0.5;
          ctx!.stroke();
        }
      }

      // Connect dots to each other if close
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const ax = (dots[i]!.x / 100) * w;
          const ay = (dots[i]!.y / 100) * h;
          const bx = (dots[j]!.x / 100) * w;
          const by = (dots[j]!.y / 100) * h;
          const dist = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.moveTo(ax, ay);
            ctx!.lineTo(bx, by);
            ctx!.strokeStyle = `${lineColor}${0.06 * (1 - dist / 120)})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }

      // === Rotating Globe (Cloudflare style) ===
      const cx = globeCenterX();
      const cy = globeCenterY();
      const r = globeRadius();
      globeRotation += 0.003;

      // Globe outline circle
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = `${globeColor}0.1)`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // Globe glow
      const glow = ctx!.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.2);
      glow.addColorStop(0, `${globeColor}0.05)`);
      glow.addColorStop(1, `${globeColor}0)`);
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
      ctx!.fill();

      // Globe dots
      for (const p of globePoints) {
        const rotatedLng = p.lng + globeRotation;
        const x3d = Math.cos(p.lat) * Math.sin(rotatedLng);
        const y3d = Math.sin(p.lat);
        const z3d = Math.cos(p.lat) * Math.cos(rotatedLng);

        if (z3d < -0.1) continue; // behind the globe

        const px = cx + x3d * r;
        const py = cy - y3d * r;
        const alpha = 0.1 + z3d * 0.5;
        const dotSize = 1 + z3d * 1.5;

        ctx!.beginPath();
        ctx!.arc(px, py, dotSize, 0, Math.PI * 2);
        ctx!.fillStyle = `${globeColor}${Math.max(0.05, alpha)})`;
        ctx!.fill();
      }

      // Globe latitude lines
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        ctx!.beginPath();
        let started = false;
        for (let lng = 0; lng <= 360; lng += 3) {
          const lngRad = (lng * Math.PI) / 180 + globeRotation;
          const x3d = Math.cos(latRad) * Math.sin(lngRad);
          const y3d = Math.sin(latRad);
          const z3d = Math.cos(latRad) * Math.cos(lngRad);
          if (z3d < 0) {
            started = false;
            continue;
          }
          const px = cx + x3d * r;
          const py = cy - y3d * r;
          if (!started) {
            ctx!.moveTo(px, py);
            started = true;
          } else ctx!.lineTo(px, py);
        }
        ctx!.strokeStyle = `${globeColor}0.08)`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Globe longitude lines
      for (let lng = 0; lng < 360; lng += 30) {
        const lngRad = (lng * Math.PI) / 180 + globeRotation;
        ctx!.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 3) {
          const latRad = (lat * Math.PI) / 180;
          const x3d = Math.cos(latRad) * Math.sin(lngRad);
          const y3d = Math.sin(latRad);
          const z3d = Math.cos(latRad) * Math.cos(lngRad);
          if (z3d < 0) {
            started = false;
            continue;
          }
          const px = cx + x3d * r;
          const py = cy - y3d * r;
          if (!started) {
            ctx!.moveTo(px, py);
            started = true;
          } else ctx!.lineTo(px, py);
        }
        ctx!.strokeStyle = `${globeColor}0.08)`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      section.removeEventListener('mousemove', handleMouseMove);
    };
  }, [dots]);

  useEffect(() => {
    const el = sectionRef.current;
    if (el) el.classList.add('hero-mounted');
  }, []);

  return (
    <section
      ref={sectionRef}
      className="hero-section relative overflow-hidden bg-background"
      style={{ minHeight: '90vh' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      <div className="relative z-10 container mx-auto flex min-h-[90vh] items-center px-4 py-24">
        <div className="max-w-2xl">
          {/* Badge */}
          <div className="hero-fade-up inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {tCommon('university')}
          </div>

          {/* Title */}
          <h1
            className="hero-fade-up mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl"
            style={{ transitionDelay: '0.2s' }}
          >
            {t('title').split('—')[0]}
            <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 bg-clip-text text-transparent">
              {'—'}
              {t('title').split('—')[1] ?? ''}
            </span>
          </h1>

          {/* Tagline */}
          <p
            className="hero-fade-up mt-6 max-w-xl text-lg text-muted-foreground sm:text-xl"
            style={{ transitionDelay: '0.4s' }}
          >
            {t('tagline')}
          </p>

          {/* CTAs */}
          <div
            className="hero-fade-up mt-10 flex flex-wrap items-center gap-4"
            style={{ transitionDelay: '0.5s' }}
          >
            <Link
              href="/researchers"
              className={buttonVariants({
                size: 'lg',
                className:
                  'group px-8 py-6 text-base shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl',
              })}
            >
              {t('cta_primary')}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
            </Link>
            <Link
              href="/analytics"
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'px-8 py-6 text-base transition-all duration-300 hover:-translate-y-0.5',
              })}
            >
              {t('cta_secondary')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
