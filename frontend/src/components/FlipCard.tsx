import { ReactNode, useState } from "react";

interface FlipCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  backContent?: ReactNode;
}

const FlipCard = ({ icon, title, description, backContent }: FlipCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
      role="button"
      tabIndex={0}
      className="h-full cursor-pointer"
    >
      <div className="relative w-full h-full transition-all duration-500" style={{
        transformStyle: "preserve-3d",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}>
        {/* Front side */}
        <div
          className="absolute inset-0 rounded-lg p-6 flex flex-col gap-3 shadow-md border bg-card"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{description}</p>
          {backContent && (
            <p className="text-xs text-primary font-medium mt-2">Click to learn more →</p>
          )}
        </div>

        {/* Back side */}
        {backContent && (
          <div
            className="absolute inset-0 rounded-lg p-6 flex flex-col gap-3 shadow-md border bg-primary text-primary-foreground"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            {backContent}
            <p className="text-xs opacity-75 mt-2">← Click to go back</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlipCard;

