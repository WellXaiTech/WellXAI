export default function Logo({ className = "", brand = "ChatGiZa" }: { className?: string; brand?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <svg width="28" height="28" viewBox="0 0 512 512" className="shrink-0" aria-hidden>
        <circle cx="256" cy="256" r="256" fill="currentColor" />
        <path d="M256 156 L346 356 L166 356 Z" className="fill-background" />
      </svg>
      <span>{brand}</span>
    </span>
  );
}
