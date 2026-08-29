export const metadata = { title: { absolute: "Privacy Policy — WellXAI" } };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 2026</p>

      <p className="mt-6 text-muted">
        This page explains what information ChatGiZa (&quot;we&quot;, &quot;us&quot;) collects when you use
        ChatGiZa — on the web or through the Android app — and how we use it.
      </p>

      <h2 className="mt-10 text-lg font-medium">Information we collect</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>
          <strong className="text-foreground">Account information.</strong> When you sign in with Google, we
          receive your name, email address, and profile picture from Google.
        </li>
        <li>
          <strong className="text-foreground">Conversations.</strong> Messages you send to ChatGiZa, and any
          files or images you attach, are sent to our AI provider to generate a response, and stored so your
          chat history is there when you sign back in on any device.
        </li>
        <li>
          <strong className="text-foreground">Usage data.</strong> To keep free usage fair, we record limited
          technical signals tied to your connection (such as whether it looks like a mobile/cellular network)
          and a message count — not your identity or browsing elsewhere. If you subscribe to a paid plan, that
          status is stored against your account.
        </li>
        <li>
          <strong className="text-foreground">Support messages.</strong> If you contact us through
          &quot;Wasiliana nasi&quot; / Get Help, we store your message and the email address you provide, and
          send it to our support team.
        </li>
        <li>
          <strong className="text-foreground">Payment information.</strong> If you subscribe to a paid plan,
          payment is processed by Stripe. We never see or store your card details ourselves.
        </li>
      </ul>

      <h2 className="mt-10 text-lg font-medium">How we use it</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>To operate ChatGiZa: generate responses, remember your chat history and preferences.</li>
        <li>To send you account emails — a welcome message on first sign-in, and payment confirmations.</li>
        <li>To prevent abuse of free usage.</li>
        <li>To respond to support requests you send us.</li>
      </ul>

      <h2 className="mt-10 text-lg font-medium">Who we share it with</h2>
      <p className="mt-3 text-muted">
        We use a small number of service providers to run ChatGiZa, each only for the purpose described:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
        <li>OpenAI — to generate chat, image, and video responses.</li>
        <li>Google — sign-in.</li>
        <li>Stripe — payment processing.</li>
        <li>Resend — delivering account emails.</li>
        <li>Vercel and Upstash — hosting and data storage.</li>
        <li>ip-api.com — a best-effort, non-identifying check of connection type, used only to reduce free-tier abuse.</li>
      </ul>
      <p className="mt-3 text-muted">We do not sell your personal information.</p>

      <h2 className="mt-10 text-lg font-medium">Data retention and your choices</h2>
      <p className="mt-3 text-muted">
        Your chat history stays stored against your account until you clear it or export it yourself from
        Settings, or until you ask us to delete your account. To request full account deletion, contact us
        using the details below.
      </p>

      <h2 className="mt-10 text-lg font-medium">Children</h2>
      <p className="mt-3 text-muted">
        ChatGiZa is not directed at children under 13, and we do not knowingly collect information from them.
      </p>

      <h2 className="mt-10 text-lg font-medium">Changes to this policy</h2>
      <p className="mt-3 text-muted">
        We may update this page from time to time. The &quot;last updated&quot; date above reflects the most
        recent revision.
      </p>

      <h2 className="mt-10 text-lg font-medium">Contact us</h2>
      <p className="mt-3 text-muted">
        Questions about this policy? Use &quot;Wasiliana nasi&quot; inside ChatGiZa, or email{" "}
        <a href="mailto:support@wellxai.world" className="text-foreground underline">
          support@wellxai.world
        </a>
        .
      </p>
    </div>
  );
}
