import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-4 py-16">
      {/* Animated background grid */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,black_40%,transparent_100%)]" />
      </div>

      {/* Floating particles */}
      <div className="pointer-events-none absolute inset-0">
        <span className="absolute left-[15%] top-[20%] size-2 animate-pulse rounded-full bg-primary/40 [animation-delay:0s] [animation-duration:3s]" />
        <span className="absolute left-[75%] top-[15%] size-1.5 animate-pulse rounded-full bg-primary/30 [animation-delay:1s] [animation-duration:4s]" />
        <span className="absolute left-[60%] top-[70%] size-2.5 animate-pulse rounded-full bg-primary/20 [animation-delay:0.5s] [animation-duration:3.5s]" />
        <span className="absolute left-[25%] top-[75%] size-1 animate-pulse rounded-full bg-primary/50 [animation-delay:2s] [animation-duration:2.5s]" />
        <span className="absolute left-[85%] top-[45%] size-2 animate-pulse rounded-full bg-primary/25 [animation-delay:1.5s] [animation-duration:4.5s]" />
        <span className="absolute left-[40%] top-[30%] size-1.5 animate-pulse rounded-full bg-primary/35 [animation-delay:0.8s] [animation-duration:3.2s]" />
      </div>

      {/* The 404 astronaut illustration */}
      <div className="not-found-float relative mb-8">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" className="drop-shadow-2xl">
          {/* Helmet */}
          <circle cx="100" cy="80" r="45" className="fill-muted stroke-border" strokeWidth="3" />
          <circle cx="100" cy="80" r="35" className="fill-background" />
          {/* Visor reflection */}
          <ellipse cx="90" cy="72" rx="12" ry="16" className="fill-primary/20" />
          {/* Confused face */}
          <circle cx="88" cy="76" r="3" className="fill-foreground/70" />
          <circle cx="112" cy="76" r="3" className="fill-foreground/70" />
          <path
            d="M92 90 Q100 86 108 90"
            className="stroke-foreground/50"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Question mark above head */}
          <text x="130" y="40" className="fill-primary text-2xl font-bold" fontSize="28">
            ?
          </text>
          {/* Body */}
          <rect
            x="75"
            y="122"
            width="50"
            height="40"
            rx="8"
            className="fill-muted stroke-border"
            strokeWidth="2"
          />
          {/* Backpack */}
          <rect
            x="65"
            y="128"
            width="12"
            height="28"
            rx="4"
            className="fill-muted stroke-border"
            strokeWidth="2"
          />
          {/* Left arm floating */}
          <path
            d="M75 135 Q55 125 50 145"
            className="stroke-border"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right arm floating */}
          <path
            d="M125 135 Q145 125 150 145"
            className="stroke-border"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Legs */}
          <path
            d="M90 162 Q85 180 80 190"
            className="stroke-border"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M110 162 Q115 180 120 190"
            className="stroke-border"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          {/* Tether/cord */}
          <path
            d="M65 142 Q30 155 20 130 Q10 105 35 95"
            className="stroke-primary/40"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
          />
          <circle cx="35" cy="95" r="3" className="fill-primary/40" />
        </svg>
      </div>

      {/* Big 404 text */}
      <div className="relative mb-6">
        <h1 className="text-[8rem] font-black leading-none tracking-tighter text-foreground/5 sm:text-[10rem]">
          404
        </h1>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl font-black tracking-tight text-foreground sm:text-6xl">
            404
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="relative z-10 mx-auto max-w-md space-y-3 text-center">
        <h2 className="text-xl font-semibold text-foreground">Oops! Page not found</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or hasn&apos;t been created yet. We
          apologize for any inconvenience.
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground" dir="rtl">
          الصفحة التي تبحث عنها غير موجودة أو لم يتم إنشاؤها بعد. نعتذر عن هذا الخلل.
        </p>
      </div>

      {/* Actions */}
      <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={buttonVariants({ variant: 'default', size: 'lg' })}>
          Go Home / الصفحة الرئيسية
        </Link>
        <Link href="/researchers" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Researchers / الباحثون
        </Link>
      </div>

      {/* CSS animation */}
      <style>{`
        .not-found-float {
          animation: nf-float 6s ease-in-out infinite;
        }
        @keyframes nf-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          25% { transform: translateY(-12px) rotate(1deg); }
          50% { transform: translateY(-6px) rotate(-1deg); }
          75% { transform: translateY(-15px) rotate(2deg); }
        }
      `}</style>
    </main>
  );
}
