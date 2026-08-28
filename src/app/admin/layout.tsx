export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // Route-level protection (redirecting non-admins to /dashboard) is
  // handled centrally in src/middleware.ts so it can't be bypassed by
  // adding a new /admin page and forgetting the check here.
  return <div className="min-h-screen p-6">{children}</div>;
}
