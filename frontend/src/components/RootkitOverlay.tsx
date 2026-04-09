import { useState, useEffect, useRef } from "react";

interface RootbeerDrop {
  id: number;
  x: number;
  duration: number;
  size: number;
  rotation: number;
}

const ROOTBEER_EMOJI = "\u{1F37A}";

const RootkitOverlay = () => {
  const [drops, setDrops] = useState<RootbeerDrop[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    const spawn = () => {
      const drop: RootbeerDrop = {
        id: nextId.current++,
        x: Math.random() * 96 + 2,
        duration: 4 + Math.random() * 3,
        size: 1.4 + Math.random() * 1,
        rotation: -15 + Math.random() * 30,
      };
      setDrops((prev) => [...prev.slice(-80), drop]);
    };
    const iv = setInterval(spawn, 180);
    return () => clearInterval(iv);
  }, []);

  return (
    <>
      <style>{`
        @keyframes rootbeer-fall {
          0%   { transform: translateY(-5vh) rotate(var(--rot)); opacity: 0; }
          8%   { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>

      <div
        className="fixed inset-0 overflow-hidden pointer-events-none select-none"
        style={{ zIndex: 1 }}
      >
        {drops.map((d) => (
          <span
            key={d.id}
            style={{
              position: "absolute",
              left: `${d.x}%`,
              top: 0,
              fontSize: `${d.size}rem`,
              animationName: "rootbeer-fall",
              animationDuration: `${d.duration}s`,
              animationTimingFunction: "ease-in",
              animationFillMode: "forwards",
              ["--rot" as string]: `${d.rotation}deg`,
            }}
          >
            {ROOTBEER_EMOJI}
          </span>
        ))}
      </div>
    </>
  );
};

export default RootkitOverlay;
