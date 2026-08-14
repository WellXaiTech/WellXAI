export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Company</h1>
      <p className="mt-4 text-muted">
        ChatGiZa was built on a simple idea: bring world-class AI closer to
        people — in the language they understand, at a price they can afford, and
        built with transparency.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">About us</h2>
          <p className="mt-2 text-sm text-muted">
            A small team building ChatGiZa for East Africa and beyond, from the
            ground up.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Careers</h2>
          <p className="mt-2 text-sm text-muted">
            We&apos;re not hiring publicly yet — but if you want to help build ChatGiZa,
            reach out.
          </p>
        </div>
      </div>

      <div className="card mt-6 rounded-2xl p-6">
        <h2 className="font-medium">How WellX AI is structured</h2>
        <p className="mt-2 text-sm text-muted">
          ChatGiZa isn&apos;t a separate company from WellX AI — it&apos;s the AI product WellX AI builds and
          operates, the same way ChatGPT is a product of OpenAI. Everything below sits under one company:
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-background p-4 text-xs leading-relaxed text-muted">
          <code>{`WELLX AI
│
├── ChatGiZa
│     └── chatgiza.com
│
├── WellX AI Platform
│     └── wellxai.com
│
└── Developers / API
      └── developers.wellxai.com`}</code>
        </pre>
      </div>

      <div className="card mt-6 rounded-2xl p-6">
        <h2 className="font-medium">Contact</h2>
        <p className="mt-2 text-sm text-muted">hello@chatgiza.com</p>
      </div>
    </div>
  );
}
