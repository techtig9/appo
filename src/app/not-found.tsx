import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center text-ink">
      <img src="/logo-icon.svg" alt="" className="mb-8 h-16 w-16 rounded-2xl" />
      <h1 className="gradient-text text-6xl font-extrabold">404</h1>
      <p className="mt-4 text-lg text-ink-secondary">This page doesn&apos;t exist — but your next app can.</p>
      <div className="mt-8 flex gap-4">
        <Link href="/" className="btn-accent">
          Back to appo
        </Link>
        <Link href="/dashboard/generator" className="btn-outline">
          Start building
        </Link>
      </div>
    </main>
  );
}
