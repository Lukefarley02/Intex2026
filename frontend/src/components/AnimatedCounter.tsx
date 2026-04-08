import { useCounterAnimation } from "@/hooks/useCounterAnimation";

interface AnimatedCounterProps {
  value: number | undefined;
  suffix?: string;
  className?: string;
}

const AnimatedCounter = ({ value, suffix = "", className = "" }: AnimatedCounterProps) => {
  const animated = useCounterAnimation(value, 2000, 0);

  if (value === undefined) {
    return <span className={className}>…</span>;
  }

  return (
    <span className={className}>
      {animated.toLocaleString()}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
