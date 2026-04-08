import { useState, useEffect, useRef } from "react";

/**
 * useCounterAnimation - Animates a number from 0 to the target value over a duration
 * @param targetValue - The final value to count to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param delay - Delay before starting the animation in milliseconds (default: 0)
 * @returns The current animated value
 */
export const useCounterAnimation = (
  targetValue: number | string | undefined,
  duration: number = 2000,
  delay: number = 0
): number | string => {
  const [count, setCount] = useState(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (targetValue === undefined || targetValue === "…") return;

    const numTarget = typeof targetValue === "string" ? parseInt(targetValue, 10) : targetValue;
    if (isNaN(numTarget)) return;

    // Only animate on first render
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    const startTime = Date.now() + delay;
    let animationFrameId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = Math.max(0, now - startTime);
      const progress = Math.min(1, elapsed / duration);

      // Easing function for smooth animation
      const eased = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

      const currentCount = Math.floor(eased * numTarget);
      setCount(currentCount);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(numTarget);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [targetValue, duration, delay]);

  return count;
};
