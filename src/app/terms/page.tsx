import Link from "next/link";

export const metadata = { title: "Terms of Service — appo" };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ink">
      <Link href="/" className="mb-8 inline-block">
        {/* eslint-disable-next-line @next/next/no-img-element --
            a local static SVG. next/image cannot optimise a vector, so it
            would add a request and a required width/height for no gain. */}
        <img src="/logo-lockup.svg" alt="appo" className="h-8 w-auto" />
      </Link>
      <h1 className="text-3xl font-extrabold">Terms of Service</h1>
      <p className="mt-2 text-sm text-ink-muted">Last updated: [DATE — fill in before launch]</p>

      <div className="mt-10 space-y-8 text-ink-secondary">
        <p>
          These Terms govern your use of appo, a product built and operated by Techtig (&quot;we,&quot; &quot;us&quot;).
          By creating an account or using appo, you agree to these Terms.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">1. The Service</h2>
          <p>
            appo generates mobile application source code (React Native/Expo projects) from natural-language
            descriptions you provide, and offers tools to preview, edit, export, and (on paid plans) build and
            submit that code.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">2. Accounts</h2>
          <p>
            You&apos;re responsible for the security of your account and for all activity under it. You must
            provide accurate information and are responsible for keeping your credentials confidential.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">3. Subscriptions, Credits &amp; Billing</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Paid plans are billed monthly or annually in advance via our payment processor (Paddle).</li>
            <li>Credits included with your plan renew each billing cycle and do not roll over unless stated otherwise.</li>
            <li>You can cancel at any time from your account&apos;s Billing page; cancellation takes effect at the end of the current billing period.</li>
          </ul>
          <div className="mt-3 rounded-xl border border-danger/40-400/25 bg-danger-subtle p-4 text-sm text-danger">
            Fill in before launch: your actual refund policy (or explicit no-refunds statement), any free-trial
            terms, and applicable tax handling.
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">4. Ownership of Generated Code</h2>
          <p>
            You own the code generated for your apps, subject to your compliance with these Terms and any
            third-party licenses (open-source packages, fonts, icon sets) included in generated projects.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">5. Acceptable Use</h2>
          <p>
            You agree not to use appo to generate apps that are illegal, infringing, malicious, or that violate
            the policies of Apple&apos;s App Store or Google Play. We reserve the right to suspend accounts
            engaged in abuse, excessive automated usage beyond our Fair Usage Policy, or fraud.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">6. Service Availability</h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted access. Scheduled maintenance and
            third-party outages (Supabase, Google Gemini, Paddle, Expo) may affect availability from time to time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">7. Limitation of Liability</h2>
          <div className="rounded-xl border border-danger/40-400/25 bg-danger-subtle p-4 text-sm text-danger">
            Fill in before launch: standard SaaS limitation-of-liability language, reviewed by a lawyer licensed
            in your operating jurisdiction. This template is a starting point, not legal advice.
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">8. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated by email or
            in-app notice before they take effect.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">9. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href="mailto:techtig9@gmail.com" className="text-info underline">
              techtig9@gmail.com
            </a>
          </p>
        </section>
      </div>

      <Link href="/" className="mt-12 inline-block text-sm text-info">
        ← Back to appo
      </Link>
    </main>
  );
}
