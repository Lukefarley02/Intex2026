import { Flame } from "lucide-react";

const DonateHeader = () => {
  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b">
      <div className="container flex items-center h-16">
        <a
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-primary hover:opacity-80 transition-opacity"
        >
          <Flame className="w-7 h-7" aria-hidden="true" />
          Ember
        </a>
      </div>
    </header>
  );
};

export default DonateHeader;
