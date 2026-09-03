import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ChatbotWidget } from "@/components/ChatbotWidget";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { createClient } from "@/lib/supabase/server";

/**
 * The workspace shell.
 *
 * Reads the signed-in profile once here rather than in every page, so the
 * header can show the real person's name and avatar. The middleware has
 * already guaranteed there is a session on /dashboard/*, so a missing
 * profile row means the account is still being provisioned — the header
 * degrades to the email rather than failing the render.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("users").select("name, email, avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };

  const headerUser = user
    ? {
        name: profile?.name ?? (user.user_metadata?.full_name as string | undefined) ?? null,
        email: profile?.email ?? user.email ?? "",
        avatarUrl: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }
    : undefined;

  return (
    <div className="min-h-screen bg-canvas">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav user={headerUser} />
          <main id="main" className="mx-auto w-full max-w-content flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <ChatbotWidget />
    </div>
  );
}
