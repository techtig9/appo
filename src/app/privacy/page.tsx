import Link from "next/link";

export const metadata = { title: "Privacy Policy — appo" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-white">
      <Link href="/" className="mb-8 inline-block">
        <img src="/logo-lockup.svg" alt="appo" className="h-8 w-auto" />
      </Link>
      <h1 className="text-3xl font-extrabold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: [DATE — fill in before launch]</p>

      <div className="mt-10 space-y-8 text-slate-300">
        <p>
          This Policy explains what data appo (operated by Techtig) collects, why, and what choices you have. We
          collect the minimum needed to run the product.
        </p>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-white">1. What We Collect</h2>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white">
                  <th className="p-3">Data</th>
                  <th className="p-3">Purpose</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="p-3">Email, name</td>
                  <td className="p-3">Account creation, login, communication</td>
                  <td className="p-3">You, at signup</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3">App descriptions &amp; generated code</td>
                  <td className="p-3">Provide the core generation service</td>
                  <td className="p-3">You, when using the generator</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3">Subscription &amp; payment status</td>
                  <td className="p-3">Billing, plan enforcement</td>
                  <td className="p-3">Paddle (we never see your card number)</td>
                </tr>
                <tr>
                  <td className="p-3">Usage data (credits used, actions taken)</td>
                  <td className="p-3">Feature gating, product improvement</td>
                  <td className="p-3">Automatically, as you use appo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">2. Third Parties We Use</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong className="text-white">Supabase</strong> — database, authentication, file storage.</li>
            <li><strong className="text-white">Google Gemini API</strong> — processes your app descriptions to generate code. Descriptions are sent to Google as part of each generation request.</li>
            <li><strong className="text-white">Paddle</strong> — payment processing. We never store your full card details.</li>
            <li><strong className="text-white">GitHub API</strong> (if you use One-Click GitHub Export) — only with your explicit authorization, to push code to a repository you choose.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">3. Cookies</h2>
          <p>
            We use a minimal set of cookies/local storage for essential site function (staying logged in,
            remembering your dark-mode preference and cookie-consent choice) and basic, privacy-respecting
            analytics. We do not use third-party advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">4. Your Rights</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li><strong className="text-white">Access &amp; export</strong> — request a copy of your data at any time.</li>
            <li><strong className="text-white">Correction</strong> — update your account details from Settings.</li>
            <li><strong className="text-white">Deletion</strong> — delete your account and data from Settings → Account, or by emailing us. We aim to complete deletion within 30 days.</li>
          </ul>
          <div className="mt-3 rounded-xl border border-fuchsia-400/25 bg-fuchsia-400/10 p-4 text-sm text-fuchsia-200">
            Fill in before launch: your actual data retention periods, the legal basis for processing (if serving
            EU/UK users, GDPR Article 6 basis), and your Data Protection Officer contact if one is required for
            your scale.
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">5. Data Security</h2>
          <p>
            Data is encrypted in transit (HTTPS) and at rest (via Supabase&apos;s managed Postgres). Access is
            restricted by role-based access control; admin actions are logged.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">6. Children</h2>
          <p>appo is not directed at children under 16, and we do not knowingly collect data from them.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">7. Changes to This Policy</h2>
          <p>We&apos;ll post updates here and, for material changes, notify you by email or in-app notice.</p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-white">8. Contact</h2>
          <p>
            Privacy questions or data requests:{" "}
            <a href="mailto:techtig9@gmail.com" className="text-cyan-400 underline">
              techtig9@gmail.com
            </a>
          </p>
        </section>
      </div>

      <Link href="/" className="mt-12 inline-block text-sm text-cyan-400">
        ← Back to appo
      </Link>
    </main>
  );
}
