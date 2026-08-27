const faqs: { question: string; answer: string }[] = [
  {
    question: "What is WellXAI?",
    answer:
      "WellXAI is the company behind ChatGiZa. We build AI that's closer to people — in the language they understand, at a price they can afford, and built with transparency.",
  },
  {
    question: "What is ChatGiZa?",
    answer:
      "ChatGiZa is our conversational AI assistant — a chat app and an API, available at chatgiza.com. It's the product WellXAI builds and operates.",
  },
  {
    question: "Is ChatGiZa free to use?",
    answer:
      "You can start using ChatGiZa for free at chatgiza.com. For team or business use, see the Business page for what's available.",
  },
  {
    question: "What languages does ChatGiZa support?",
    answer:
      "ChatGiZa is built to understand Swahili, English, and code-switched conversation naturally, with more languages planned.",
  },
  {
    question: "How do I bring ChatGiZa to my company?",
    answer:
      "Visit the Business page, or email hello@chatgiza.com and our team will get back to you about team access and integration.",
  },
  {
    question: "Where can I get API access?",
    answer:
      "The Developers page has details on the ChatGiZa API — bring ChatGiZa into your own product with a simple REST API.",
  },
  {
    question: "How is my data handled?",
    answer:
      "See our Privacy Policy for details on how ChatGiZa collects, uses, and protects your data.",
  },
  {
    question: "How do I contact support?",
    answer: "Email hello@chatgiza.com and our team will get back to you.",
  },
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Help &amp; Support</h1>
      <p className="mt-4 text-muted">
        Answers to common questions about WellXAI and ChatGiZa. Can&apos;t find what
        you&apos;re looking for? Email{" "}
        <span className="text-foreground">hello@chatgiza.com</span>.
      </p>

      <div className="mt-10 space-y-3">
        {faqs.map((f) => (
          <details key={f.question} className="card group rounded-2xl p-5">
            <summary className="cursor-pointer list-none font-medium marker:content-none">
              <span className="flex items-center justify-between gap-4">
                {f.question}
                <span className="text-muted transition-transform group-open:rotate-45">+</span>
              </span>
            </summary>
            <p className="mt-3 text-sm text-muted">{f.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
