'use client';

import { useEffect, useRef, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { LAND_POLYGONS, IRAQ_POLYGON } from './globe-data';

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
      Array.from({ length: 50 }, (_, i) => ({
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
    const isRtl = document.documentElement.dir === 'rtl';
    const globeCenterX = () => (isRtl ? w * 0.22 : w * 0.78);
    const globeCenterY = () => h * 0.5;
    const globeRadius = () => Math.min(w, h) * 0.3;

    // Pre-compute radians + trig values once (not every frame)
    const landPaths = LAND_POLYGONS.map((poly) =>
      poly.map(([lat, lng]) => {
        const latR = (lat * Math.PI) / 180;
        const lngR = (lng * Math.PI) / 180;
        return { cosLat: Math.cos(latR), sinLat: Math.sin(latR), lngR };
      }),
    );
    const iraqPath = IRAQ_POLYGON.map(([lat, lng]) => {
      const latR = (lat * Math.PI) / 180;
      const lngR = (lng * Math.PI) / 180;
      return { cosLat: Math.cos(latR), sinLat: Math.sin(latR), lngR };
    });

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
          if (dist < 100) {
            ctx!.beginPath();
            ctx!.moveTo(ax, ay);
            ctx!.lineTo(bx, by);
            ctx!.strokeStyle = `${lineColor}${0.06 * (1 - dist / 100)})`;
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

      // Subtle grid lines (latitude)
      for (let lat = -60; lat <= 60; lat += 30) {
        const latRad = (lat * Math.PI) / 180;
        ctx!.beginPath();
        let started = false;
        for (let lng = 0; lng <= 360; lng += 4) {
          const lngRad = (lng * Math.PI) / 180 + globeRotation;
          const z3d = Math.cos(latRad) * Math.cos(lngRad);
          if (z3d < 0) {
            started = false;
            continue;
          }
          const px = cx + Math.cos(latRad) * Math.sin(lngRad) * r;
          const py = cy - Math.sin(latRad) * r;
          if (!started) {
            ctx!.moveTo(px, py);
            started = true;
          } else ctx!.lineTo(px, py);
        }
        ctx!.strokeStyle = `${globeColor}0.06)`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Land polygons (real GeoJSON outlines)
      for (const poly of landPaths) {
        ctx!.beginPath();
        let first = true;
        let visible = false;
        for (const p of poly) {
          const rl = p.lngR + globeRotation;
          const sinRl = Math.sin(rl);
          const cosRl = Math.cos(rl);
          const z3d = p.cosLat * cosRl;
          if (z3d < -0.05) {
            first = true;
            continue;
          }
          visible = true;
          const px = cx + p.cosLat * sinRl * r;
          const py = cy - p.sinLat * r;
          if (first) {
            ctx!.moveTo(px, py);
            first = false;
          } else ctx!.lineTo(px, py);
        }
        if (visible) {
          ctx!.closePath();
          ctx!.fillStyle = `${globeColor}0.15)`;
          ctx!.fill();
          ctx!.strokeStyle = `${globeColor}0.25)`;
          ctx!.lineWidth = 0.6;
          ctx!.stroke();
        }
      }

      // Iraq — bright glow
      const iraqScreenPoints: Array<{ x: number; y: number; z: number }> = [];
      for (const p of iraqPath) {
        const rl = p.lngR + globeRotation;
        const z3d = p.cosLat * Math.cos(rl);
        iraqScreenPoints.push({
          x: cx + p.cosLat * Math.sin(rl) * r,
          y: cy - p.sinLat * r,
          z: z3d,
        });
      }
      const iraqVisible = iraqScreenPoints.some((p) => p.z > 0);
      if (iraqVisible) {
        // Glow effect
        const iraqCenterX = iraqScreenPoints.reduce((s, p) => s + p.x, 0) / iraqScreenPoints.length;
        const iraqCenterY = iraqScreenPoints.reduce((s, p) => s + p.y, 0) / iraqScreenPoints.length;
        const glowR = ctx!.createRadialGradient(
          iraqCenterX,
          iraqCenterY,
          0,
          iraqCenterX,
          iraqCenterY,
          r * 0.15,
        );
        glowR.addColorStop(0, isDark ? 'rgba(250, 204, 21, 0.4)' : 'rgba(234, 179, 8, 0.35)');
        glowR.addColorStop(1, isDark ? 'rgba(250, 204, 21, 0)' : 'rgba(234, 179, 8, 0)');
        ctx!.fillStyle = glowR;
        ctx!.beginPath();
        ctx!.arc(iraqCenterX, iraqCenterY, r * 0.15, 0, Math.PI * 2);
        ctx!.fill();

        // Iraq shape
        ctx!.beginPath();
        let iraqFirst = true;
        for (const p of iraqScreenPoints) {
          if (p.z < -0.05) continue;
          if (iraqFirst) {
            ctx!.moveTo(p.x, p.y);
            iraqFirst = false;
          } else ctx!.lineTo(p.x, p.y);
        }
        ctx!.closePath();
        ctx!.fillStyle = isDark ? 'rgba(250, 204, 21, 0.7)' : 'rgba(234, 179, 8, 0.6)';
        ctx!.fill();
        ctx!.strokeStyle = isDark ? 'rgba(250, 204, 21, 0.9)' : 'rgba(234, 179, 8, 0.8)';
        ctx!.lineWidth = 1.5;
        ctx!.stroke();

        // Pulsing dot on Baghdad
        const baghdadLat = (33.3 * Math.PI) / 180;
        const baghdadLng = (44.4 * Math.PI) / 180 + globeRotation;
        const bz = Math.cos(baghdadLat) * Math.cos(baghdadLng);
        if (bz > 0) {
          const bx = cx + Math.cos(baghdadLat) * Math.sin(baghdadLng) * r;
          const by = cy - Math.sin(baghdadLat) * r;
          const pulse = 2 + Math.sin(Date.now() / 300) * 1.5;
          ctx!.beginPath();
          ctx!.arc(bx, by, pulse + 3, 0, Math.PI * 2);
          ctx!.fillStyle = isDark ? 'rgba(250, 204, 21, 0.2)' : 'rgba(234, 179, 8, 0.15)';
          ctx!.fill();
          ctx!.beginPath();
          ctx!.arc(bx, by, pulse, 0, Math.PI * 2);
          ctx!.fillStyle = isDark ? 'rgba(250, 204, 21, 0.9)' : 'rgba(234, 179, 8, 0.8)';
          ctx!.fill();
        }
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
        <div className="max-w-2xl ltr:mr-auto rtl:ml-auto">
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
