export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="h-7 w-7 rounded-lg bg-foreground flex items-center justify-center text-background text-sm font-bold">
        W
      </span>
      <span>WellX AI</span>
    </span>
  );
}
