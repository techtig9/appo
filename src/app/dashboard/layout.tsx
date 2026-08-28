import { Sidebar } from "@/components/Sidebar";
import { TopNav } from "@/components/TopNav";
import { ChatbotWidget } from "@/components/ChatbotWidget";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#08080f] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden"><div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet/10 blur-[120px]"/><div className="absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-fuchsia/10 blur-[120px]"/></div>
      <div className="relative flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <TopNav />
          <main className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
      <ChatbotWidget />
    </div>
  );
}
