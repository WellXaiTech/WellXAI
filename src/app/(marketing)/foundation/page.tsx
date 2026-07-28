export default function FoundationPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">WellX Foundation</h1>
      <p className="mt-4 text-muted">
        The WellX Foundation is our long-term commitment to making sure the benefits of
        AI reach beyond paying customers — supporting education, local language
        technology, and community access to AI tools.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Education</h2>
          <p className="mt-2 text-sm text-muted">
            Free ChatGiZa access for students and schools.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Language</h2>
          <p className="mt-2 text-sm text-muted">
            Investing in Swahili and other local-language AI research.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Access</h2>
          <p className="mt-2 text-sm text-muted">
            Bringing AI tools to communities that don&apos;t typically get early access.
          </p>
        </div>
      </div>
    </div>
  );
}
