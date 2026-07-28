const CHAT_EXAMPLE = `curl -X POST https://api.wellx.ai/v1/chat \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "chatgiza-1",
    "messages": [
      { "role": "user", "content": "Hi, what can you help me with?" }
    ]
  }'`;

const CHAT_RESPONSE = `{
  "id": "msg_01Wx...",
  "model": "chatgiza-1",
  "role": "assistant",
  "content": "Hi! I can help you write, plan, brainstorm, and more."
}`;

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="card overflow-x-auto rounded-xl p-4 text-xs leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">
        API Platform — Early Access
      </span>
      <h1 className="mt-4 text-3xl font-semibold">WellX API</h1>
      <p className="mt-3 text-muted">
        Bring ChatGiZa directly into your product. The endpoints below show the shape
        the public API will follow — they are not open to everyone yet.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="mt-2 text-muted">
          Every request needs an API key in the{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">Authorization: Bearer</code>{" "}
          header. You&apos;ll be able to generate your API key from the account dashboard
          once it opens.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">POST /v1/chat</h2>
        <p className="mt-2 mb-3 text-muted">Send a message to ChatGiZa and get a reply.</p>
        <CodeBlock code={CHAT_EXAMPLE} />
        <p className="mt-3 mb-2 text-sm text-muted">Example response:</p>
        <CodeBlock code={CHAT_RESPONSE} />
      </section>

      <section className="mt-12 card rounded-2xl p-6">
        <h2 className="text-lg font-semibold">Want early access?</h2>
        <p className="mt-2 text-muted text-sm">
          Email <span className="text-foreground">hello@wellx.ai</span> to get on the
          API early access list.
        </p>
      </section>
    </div>
  );
}
