import ApiKeysPanel from "@/components/ApiKeysPanel";

const CHAT_EXAMPLE = `curl -X POST https://www.chatgiza.com/api/v1/chat \\
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
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted">API Platform</span>
      <h1 className="mt-4 text-3xl font-semibold">ChatGiZa API</h1>
      <p className="mt-3 text-muted">
        Bring ChatGiZa directly into your product. Generate an API key below and start making requests.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Authentication</h2>
        <p className="mt-2 text-muted">
          Every request needs an API key in the{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5">Authorization: Bearer</code>{" "}
          header. Generate one from &quot;Your API Keys&quot; below.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">POST /api/v1/chat</h2>
        <p className="mt-2 mb-3 text-muted">Send a message to ChatGiZa and get a reply.</p>
        <CodeBlock code={CHAT_EXAMPLE} />
        <p className="mt-3 mb-2 text-sm text-muted">Example response:</p>
        <CodeBlock code={CHAT_RESPONSE} />
      </section>

      <ApiKeysPanel />
    </div>
  );
}
