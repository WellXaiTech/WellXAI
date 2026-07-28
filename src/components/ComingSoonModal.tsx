"use client";

export default function ComingSoonModal({
  title,
  description,
  onClose,
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="card w-full max-w-sm rounded-2xl p-5 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold">{title}</h2>
        <p className="mb-4 text-sm text-muted">{description ?? "This is coming soon — not built yet."}</p>
        <button
          onClick={onClose}
          className="btn-primary w-full rounded-full py-2 text-sm font-medium hover:opacity-85"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
