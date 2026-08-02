export const metadata = { title: "Terms of Service — ChatGiZa" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 w-full">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 2026</p>

      <p className="mt-6 text-muted">
        These terms govern your use of ChatGiZa (&quot;we&quot;, &quot;us&quot;). By
        signing in or using ChatGiZa, you agree to them.
      </p>

      <h2 className="mt-10 text-lg font-medium">Using ChatGiZa</h2>
      <p className="mt-3 text-muted">
        You can use ChatGiZa to chat, generate images and videos, search the web, and other features we make
        available. A limited number of messages are free; continued or paid usage may require signing in or
        subscribing to a plan. Don&apos;t use ChatGiZa to break the law, harm others, or attempt to abuse,
        overload, or circumvent our free-usage limits (for example, creating repeated accounts to bypass them).
      </p>

      <h2 className="mt-10 text-lg font-medium">Accounts</h2>
      <p className="mt-3 text-muted">
        You sign in with your Google account. You&apos;re responsible for activity under your account. We may
        suspend or terminate access for accounts that abuse the service or violate these terms.
      </p>

      <h2 className="mt-10 text-lg font-medium">Paid plans</h2>
      <p className="mt-3 text-muted">
        Paid plans are billed through Stripe on a recurring basis. You can cancel any time from the Upgrade
        Plan screen; cancellation takes effect at the end of the current billing period.
      </p>

      <h2 className="mt-10 text-lg font-medium">AI-generated content</h2>
      <p className="mt-3 text-muted">
        ChatGiZa uses AI to generate text, images, and video. Responses can be inaccurate or unsuitable for
        every purpose — use your judgment, especially for anything important (medical, legal, financial, or
        safety-related). You&apos;re responsible for how you use what ChatGiZa produces.
      </p>

      <h2 className="mt-10 text-lg font-medium">No warranty, limitation of liability</h2>
      <p className="mt-3 text-muted">
        ChatGiZa is provided &quot;as is&quot;, without warranties of any kind. To the fullest extent permitted
        by law, we are not liable for indirect, incidental, or consequential damages arising from your use
        of ChatGiZa.
      </p>

      <h2 className="mt-10 text-lg font-medium">Changes</h2>
      <p className="mt-3 text-muted">
        We may update these terms from time to time. Continued use of ChatGiZa after a change means you accept
        the updated terms.
      </p>

      <h2 className="mt-10 text-lg font-medium">Contact us</h2>
      <p className="mt-3 text-muted">
        Questions about these terms? Use &quot;Wasiliana nasi&quot; inside ChatGiZa, or email{" "}
        <a href="mailto:nicoloustz@gmail.com" className="text-foreground underline">
          nicoloustz@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
