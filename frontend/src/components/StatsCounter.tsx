// frontend/src/components/StatsCounter.tsx
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatItem {
  value: number;
  label: string;
  format?: "integer" | "decimal" | "percent" | "currency";
  suffix?: string;
}

interface StatsCounterProps {
  stats: StatItem[];
  heading?: string;
  bg?: "white" | "light" | "ember";
  duration?: number;
}

// ─── Formatting helper ────────────────────────────────────────────────────────

function formatValue(value: number, format: StatItem["format"] = "integer"): string {
  switch (format) {
    case "decimal":
      return value.toLocaleString("en-US", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      });
    case "percent":
      return `${Math.round(value)}%`;
    case "currency":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "integer":
    default:
      return Math.round(value).toLocaleString("en-US");
  }
}

// ─── Single animated number ───────────────────────────────────────────────────

function AnimatedNumber({
  target,
  format,
  suffix,
  duration,
  active,
}: {
  target: number;
  format?: StatItem["format"];
  suffix?: string;
  duration: number;
  active: boolean;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(eased * target);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(target);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration]);

  return (
    <span>
      {formatValue(displayed, format)}
      {suffix && <span className="text-5xl">{suffix}</span>}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function StatsCounter({
  stats,
  heading,
  bg = "white",
  duration = 2000,
}: StatsCounterProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasTriggered, setHasTriggered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setHasTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasTriggered]);

  const bgClass =
    bg === "ember"
      ? "gradient-ember text-white"
      : bg === "light"
      ? "bg-primary-light"
      : "bg-white";

  const labelClass =
    bg === "ember" ? "text-white/80" : "text-muted-foreground";

  const numberClass =
    bg === "ember" ? "text-white" : "text-foreground";

  return (
    <section ref={sectionRef} className={`w-full py-16 px-6 ${bgClass}`}>
      {heading && (
        <h2 className="text-center text-2xl font-semibold mb-12 tracking-tight">
          {heading}
        </h2>
      )}

      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
        {stats.map((stat, i) => (
          <div key={i} className="flex flex-col items-center text-center gap-3">
            <p className={`text-sm leading-snug max-w-[200px] ${labelClass}`}>
              {stat.label}
            </p>
            <p className={`text-6xl md:text-7xl font-bold tracking-tight ${numberClass}`}>
              <AnimatedNumber
                target={stat.value}
                format={stat.format}
                suffix={stat.suffix}
                duration={duration}
                active={hasTriggered}
              />
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StatsCounter;
