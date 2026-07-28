const stories = [
  {
    title: "How a small retailer uses ChatGiZa to answer customers in Swahili",
    excerpt:
      "Cutting response time from hours to seconds, without hiring a bigger support team.",
  },
  {
    title: "Building a company on top of an assistant that's still learning",
    excerpt: "What it's like founding WellX AI in public, one product at a time.",
  },
];

export default function StoriesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Stories</h1>
      <p className="mt-4 text-muted">How people are using WellX AI.</p>
      <div className="mt-10 space-y-6">
        {stories.map((s) => (
          <div key={s.title} className="card rounded-2xl p-6">
            <h2 className="font-medium">{s.title}</h2>
            <p className="mt-2 text-sm text-muted">{s.excerpt}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
