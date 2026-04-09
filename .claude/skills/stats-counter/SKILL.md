---
name: stats-counter
description: >
  Animated impact-stats UI component for the Intex2026 ember-hope-flow frontend.
  Renders a responsive grid of large, bold numbers that count up from zero when
  the section scrolls into the viewport — inspired by the ZGF PDX Airport page.
  Use this skill whenever the user wants to: add a stats section, show impact
  numbers, display KPIs with animation, or add a "count-up" feature to any page.
  Also trigger when the user says "number feature", "scrolling numbers",
  "animated stats", or "impact numbers". FRONTEND UI ONLY — no backend changes.
---

# Animated Stats Counter — Frontend UI Component

## What this builds

A reusable React component that creates a full-width stats section.
**This skill only touches frontend files** — no controllers, no API routes,
no database changes.

Each stat cell contains:
- A small gray **label** above (1–2 lines of descriptive text, centered)
- A **massive bold number** below that counts up from 0 to its target value
  the first time the section scrolls into the viewport

The aesthetic mirrors the ZGF reference: minimal white/off-white background,
charcoal numbers, no card borders. The numbers are the visual hero.

---

## File to create

| Action | Path |
|--------|------|
| **Create** | `frontend/src/components/StatsCounter.tsx` |

Then **import and use** it on whichever page you need it.

---

## Step 1 — Create `StatsCounter.tsx`

Create `frontend/src/components/StatsCounter.tsx` with the content below.
The component is fully self-contained — it has its own animation hook and
`IntersectionObserver` wiring. No external libraries needed.

```tsx
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
   *  "integer"  → 35,000,000
   *  "decimal"  → 9.0  (one decimal place)
   *  "percent"  → 70%
   *  "currency" → $1,500
   */
  format?: "integer" | "decimal" | "percent" | "currency";
  /** Optional suffix appended after the formatted number (e.g. "+", "K"). */
  suffix?: string;
}

interface StatsCounterProps {
  /** Array of stat items to display. */
  stats: StatItem[];
  /** Optional heading above the grid. */
  heading?: string;
  /**
   * Background style:
   *  "white"  → pure white bg, charcoal numbers (default)
   *  "light"  → warm off-white (bg-primary-light)
   *  "ember"  → orange-to-teal gradient, white numbers
   */
  bg?: "white" | "light" | "ember";
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
            {/* Label above — small, gray, max 2 lines */}
            <p className={`text-sm leading-snug max-w-[200px] ${labelClass}`}>
              {stat.label}
            </p>

            {/* Large animated number */}
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
```

---

## Step 2 — Use it on a page

Import and drop the component anywhere in a `.tsx` page. Pass stats as plain
props — either hardcoded or from whatever data you already have loaded.

```tsx
import StatsCounter from "@/components/StatsCounter";

// ── Anywhere inside the page's JSX ──

<StatsCounter
  heading="Our Impact"
  stats={[
    { value: 342,  label: "Girls supported since founding",    format: "integer"  },
    { value: 12,   label: "Safe houses across Southeast Asia", format: "integer"  },
    { value: 87,   label: "Donor retention rate",              format: "percent"  },
    { value: 1500, label: "Average cost to support one girl",  format: "currency" },
    { value: 94,   label: "Program completion rate",           format: "percent"  },
    { value: 6,    label: "Countries with active operations",  format: "integer"  },
  ]}
/>
```

If the page already fetches data from the backend, just map the response fields
to `StatItem` values inline — no changes to the backend are needed.

```tsx
// Example: data already loaded by a parent react-query hook
<StatsCounter
  stats={[
    { value: dashStats.activeDonors,   label: "Active donors",            format: "integer"  },
    { value: dashStats.ytdDonations,   label: "Donations this year",       format: "currency" },
    { value: dashStats.donorRetention, label: "12-month donor retention",  format: "percent"  },
  ]}
/>
```

---

## Background variants

| `bg` prop | Look | Best placement |
|-----------|------|----------------|
| `"white"` (default) | White bg, charcoal numbers | Between sections on any page |
| `"light"` | Warm off-white (`bg-primary-light`) | Alternating content sections |
| `"ember"` | Orange → teal gradient, white text | Hero sections, donation pages |

---

## Number formats quick reference

| `format` | Input | Output |
|----------|-------|--------|
| `"integer"` (default) | `35000000` | `35,000,000` |
| `"decimal"` | `9` | `9.0` |
| `"percent"` | `70` | `70%` |
| `"currency"` | `1500` | `$1,500` |

Add a `suffix` prop for units that don't fit the above (e.g. `suffix="+"` for
`342+`, or `suffix=" yrs"` for `60 yrs`).

---

## Design notes (matching the ZGF reference)

- **Font size**: `text-6xl md:text-7xl font-bold` — intentionally oversized so
  the number is the visual anchor, matching the reference's huge typography.
- **Label placement**: Label sits *above* the number, constrained to
  `max-w-[200px]` so it wraps naturally to 1–2 lines like the reference.
- **Animation curve**: Ease-out cubic (`1 − (1−t)³`) — numbers sprint off zero
  and glide smoothly to their target. This is the "running number" feel from the
  reference site.
- **Trigger once**: `IntersectionObserver` fires the animation once when 25% of
  the section is visible. It does **not** restart on scroll-back (intentional —
  restarting feels cheap on repeat views).
- **Accessibility**: After animation completes, the DOM contains the real
  formatted number as plain text, so screen readers get the correct value.

---

## Tailwind classes used (all pre-existing in the Ember theme)

| Class | Purpose |
|-------|---------|
| `bg-primary-light` | Warm off-white background |
| `gradient-ember` | Orange → teal gradient (used in hero sections) |
| `text-foreground` | Near-black charcoal for numbers |
| `text-muted-foreground` | Gray for label text |

If `gradient-ember` doesn't apply to a `<section>` tag yet, add one line to
`frontend/src/index.css` (no other CSS changes needed):

```css
section.gradient-ember {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
}
```

---

## Common mistakes to avoid

- **Don't use `setInterval`** for the animation — `requestAnimationFrame` ties
  it to the display refresh rate and prevents drift.
- **Don't nest the `IntersectionObserver`** inside the child number component —
  keep it on the section wrapper so all numbers start at the same time.
- **Don't pass `value: 0`** — the animation won't be visible. Skip the stat or
  use a loading guard until real data arrives.
- **Don't forget cleanup** — the template already cancels the animation frame on
  unmount; keep that `return` in the `useEffect`.
