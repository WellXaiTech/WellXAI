export default function ResearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Research</h1>
      <p className="mt-4 text-muted">
        WellX AI&apos;s research focuses on making conversational AI more useful, more
        affordable, and more accessible — especially for languages and regions that
        mainstream AI labs underserve today.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Multilingual understanding</h2>
          <p className="mt-2 text-sm text-muted">
            Improving how ChatGiZa understands and responds naturally across Swahili,
            English, and code-switched conversation.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Safety &amp; reliability</h2>
          <p className="mt-2 text-sm text-muted">
            Building evaluation and safety practices so ChatGiZa stays honest, helpful,
            and predictable as it scales.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Efficient inference</h2>
          <p className="mt-2 text-sm text-muted">
            Exploring how to serve high-quality responses at low cost, so pricing can
            stay accessible.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Applied product research</h2>
          <p className="mt-2 text-sm text-muted">
            Studying how people actually use ChatGiZa day to day, and feeding that back
            into the product roadmap.
          </p>
        </div>
      </div>
    </div>
  );
}
