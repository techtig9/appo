import { createServiceRoleClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function PublicPreviewPage({ params }: { params: { slug: string } }) {
  const supabase = createServiceRoleClient();

  const { data: app } = await supabase
    .from("apps")
    .select("name, version, platforms, created_at")
    .eq("share_slug", params.slug)
    .single();

  if (!app) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center text-ink">
      <img src="/logo-icon.svg" alt="" className="mb-6 h-14 w-14 rounded-2xl" />
      <h1 className="text-3xl font-bold">{app.name}</h1>
      <p className="mt-2 text-ink-secondary">
        v{app.version} · built for {app.platforms?.join(", ")}
      </p>
      <div className="glass-card mt-8 w-full p-6 text-sm text-ink-secondary">
        This is a shared, read-only preview generated with{" "}
        <a href="/" className="text-info underline">
          appo
        </a>
        . The live in-app Expo Snack preview is only available to the app&apos;s owner in their dashboard —
        this page shows the app&apos;s public details.
      </div>
      <a href="/" className="btn-accent mt-8">
        Build your own with appo
      </a>
    </main>
  );
}
