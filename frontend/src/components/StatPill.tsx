interface StatPillProps {
  value: string;
  label: string;
}

const StatPill = ({ value, label }: StatPillProps) => (
  <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-sm border animate-count-up">
    <span className="text-lg font-bold text-primary">{value}</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
);

export default StatPill;
