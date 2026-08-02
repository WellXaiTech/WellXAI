export default function BusinessPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">ChatGiZa for Business</h1>
      <p className="mt-4 text-muted">
        Bring ChatGiZa and its API into your company&apos;s workflows — customer
        support, internal tools, content, and more.
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Team access</h2>
          <p className="mt-2 text-sm text-muted">
            Roll ChatGiZa out across your whole team with shared usage and controls.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">API integration</h2>
          <p className="mt-2 text-sm text-muted">
            Connect ChatGiZa directly into the products and internal systems you already run.
          </p>
        </div>
        <div className="card rounded-2xl p-6">
          <h2 className="font-medium">Dedicated support</h2>
          <p className="mt-2 text-sm text-muted">
            A direct line to our team for onboarding, integration help, and roadmap input.
          </p>
        </div>
      </div>

      <div className="card mt-12 rounded-2xl p-8 text-center">
        <h2 className="text-lg font-semibold">Want to bring ChatGiZa to your company?</h2>
        <p className="mt-2 text-sm text-muted">
          Email <span className="text-foreground">hello@chatgiza.com</span> and our team will get back to you.
        </p>
      </div>
    </div>
  );
}
