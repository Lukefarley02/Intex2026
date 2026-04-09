import { ReactNode, useState } from "react";

interface FlipCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  backContent?: ReactNode;
}

const FlipCard = ({ icon, title, backContent }: FlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Card flip area */}
      <div
        className="relative w-full h-52 cursor-pointer"
        style={{ perspective: "1000px" }}
        onMouseEnter={() => setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? `${title} — press Enter to go back` : `${title} — hover or press Enter to learn more`}
      >
        <div
          className="relative w-full h-full transition-all duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front — icon + title + flip hint */}
          <div
            className="absolute inset-0 rounded-xl p-6 flex flex-col items-center justify-center gap-3 shadow-md border bg-card"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              {icon}
            </div>
            <h3 className="font-semibold text-foreground text-center text-base">{title}</h3>
            {/* Flip hint */}
            <span className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-primary">
              Learn more →
            </span>
          </div>

          {/* Back */}
          {backContent && (
            <div
              className="absolute inset-0 rounded-xl p-10 flex flex-col items-center justify-center shadow-md border bg-primary text-primary-foreground text-center"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {backContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
