export default function CompanyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Company</h1>
      <p className="mt-4 text-muted">
        WellX AI was founded on a simple idea: bring world-class AI closer to
        people — in the language they understand, at a price they can afford, and
        built with transparency. ChatGiZa, our first product, is just the beginning
        of that journey.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">About us</h2>
          <p className="mt-2 text-sm text-muted">
            A small team building AI products for East Africa and beyond, from the
            ground up.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Careers</h2>
          <p className="mt-2 text-sm text-muted">
            We&apos;re not hiring publicly yet — but if you want to help build WellX AI,
            reach out.
          </p>
        </div>
      </div>

      <div className="card mt-6 rounded-2xl p-6">
        <h2 className="font-medium">Contact</h2>
        <p className="mt-2 text-sm text-muted">hello@wellx.ai</p>
      </div>
    </div>
  );
}
