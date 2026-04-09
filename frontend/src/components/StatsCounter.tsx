// frontend/src/components/StatsCounter.tsx
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatItem {
  /** The final numeric value to count up to. */
  value: number;
  /** Short descriptive label shown above the number (1–2 lines). */
  label: string;
  /**
   * How to format the number:
   *  "integer"  → 35,000
   *  "decimal"  → 9.0  (one decimal place)
   *  "percent"  → 70%
   *  "currency" → $1,500
   */
  format?: "integer" | "decimal" | "percent" | "currency";
  /** Optional suffix appended after the formatted number (e.g. "+", "yrs"). */
  suffix?: string;
}

interface StatsCounterProps {
  /** Array of stat items to display. */
  stats: StatItem[];
  /** Optional Lora serif heading above the grid. */
  heading?: string;
  /**
   * Background style:
   *  "white"  → pure white bg, charcoal numbers (default)
   *  "light"  → light grey (#F5F5F5), charcoal numbers
   *  "dark"   → near-black bg, white numbers (full-bleed dark sections)
   */
  bg?: "white" | "light" | "dark";
  /** Count-up animation duration in ms. Default: 2000. */
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
      // Ease-out cubic: fast start, smooth landing
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
      {suffix && (
        <span style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)" }}>{suffix}</span>
      )}
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

  // Fire count-up once when 25% of the section enters the viewport
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

  const bgStyle: React.CSSProperties =
    bg === "dark"
      ? { background: "#1a1a1a" }
      : bg === "light"
      ? { background: "#F5F5F5" }
      : { background: "#ffffff" };

  const labelColor = bg === "dark" ? "#999999" : "#6b6b6b";
  const numberColor = bg === "dark" ? "#ffffff" : "#1a1a1a";

  return (
    <section
      ref={sectionRef}
      style={{
        ...bgStyle,
        width: "100%",
        padding: "96px 24px",
      }}
    >
      {heading && (
        <h2
          style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            fontWeight: 400,
            lineHeight: "1.4em",
            textAlign: "center",
            marginBottom: "64px",
            color: numberColor,
          }}
        >
          {heading}
        </h2>
      )}

      <div
        style={{
          maxWidth: "1024px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "64px 48px",
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "16px",
            }}
          >
            {/* Label above — Aileron, light weight, gray */}
            <p
              style={{
                fontFamily: "'Aileron', 'Inter', system-ui, sans-serif",
                fontSize: "1.1rem",
                fontWeight: 300,
                lineHeight: "1.6em",
                color: labelColor,
                maxWidth: "220px",
                margin: 0,
              }}
            >
              {stat.label}
            </p>

            {/* Large animated number — Lora serif, weight 400 */}
            <p
              style={{
                fontFamily: "'Lora', Georgia, serif",
                fontSize: "clamp(3.2rem, 6vw, 4.8rem)",
                fontWeight: 400,
                lineHeight: "1.1em",
                color: numberColor,
                margin: 0,
              }}
            >
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
