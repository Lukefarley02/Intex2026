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
      <div className="relative w-full h-44" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full h-full transition-all duration-500"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front — icon + title only */}
          <div
            className="absolute inset-0 rounded-lg p-6 flex flex-col items-center justify-center gap-3 shadow-md border bg-card"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
              {icon}
            </div>
            <h3 className="font-semibold text-foreground text-center">{title}</h3>
          </div>

          {/* Back */}
          {backContent && (
            <div
              className="absolute inset-0 rounded-lg p-6 flex flex-col gap-3 shadow-md border bg-primary text-primary-foreground"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {backContent}
            </div>
          )}
        </div>
      </div>

      {/* Orange action button below the card */}
      {backContent && (
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          {isFlipped ? "← Go back" : "Learn more →"}
        </button>
      )}
    </div>
  );
};

export default FlipCard;
