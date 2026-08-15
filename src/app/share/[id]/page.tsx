import Link from "next/link";
import { notFound } from "next/navigation";
import { kv } from "@vercel/kv";
import Logo from "@/components/Logo";
import { shareKey, type SharedConversation } from "@/lib/share";

export const dynamic = "force-dynamic";

export default async function SharedConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let conversation: SharedConversation | null = null;
  try {
    conversation = await kv.get<SharedConversation>(shareKey(id));
  } catch (err) {
    console.error("Share page load error", err);
  }

  if (!conversation) notFound();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10">
      <Link href="/">
        <Logo />
      </Link>

      <h1 className="mt-8 text-2xl font-semibold tracking-tight">{conversation.title}</h1>
      <p className="mt-1 text-sm text-muted">Shared conversation — read-only</p>

      <div className="mt-8 flex flex-1 flex-col gap-6">
        {conversation.messages.map((message, i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">{message.role === "user" ? "You" : "ChatGiZa"}</span>
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{message.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
        <p className="text-xs text-muted">ChatGiZa is AI and can make mistakes.</p>
        <Link
          href="/chatgiza"
          className="rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
        >
          Try ChatGiZa
        </Link>
      </div>
    </div>
  );
}
