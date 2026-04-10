import { useEffect, useRef, useState } from "react";

interface StatPillProps {
  value: string;
  label: string;
}

const StatPill = ({ value, label }: StatPillProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-sm border ${
        isVisible ? "animate-count-up" : ""
      }`}
    >
      <span className="text-lg font-bold text-primary">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
};

export default StatPill;
