import { useEffect, useRef, useState } from "react";
import { useCounterAnimation } from "@/hooks/useCounterAnimation";

interface AnimatedCounterProps {
  value: number | undefined;
  suffix?: string;
  className?: string;
}

const AnimatedCounter = ({ value, suffix = "", className = "" }: AnimatedCounterProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const animated = useCounterAnimation(isVisible ? value : undefined, 2000, 0);

  if (value === undefined) {
    return (
      <span ref={ref} className={className}>
        …
      </span>
    );
  }

  return (
    <span ref={ref} className={className}>
      {animated.toLocaleString()}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
