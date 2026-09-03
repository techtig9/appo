"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [tab, setTab] = useState<"users" | "subscriptions" | "payments">("users");
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/admin/${tab}`)
      .then((r) => r.json())
      .then((d) => setData(d[tab] ?? []));
  }, [tab]);

  async function overridePlan(subscriptionId: string, plan: string) {
    await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId, plan }),
    });
    setData((prev) => prev.map((s) => (s.id === subscriptionId ? { ...s, plan } : s)));
  }

  return (
    <div className="fade-in space-y-6">
      <h1 className="text-2xl font-semibold text-ink">Admin Panel</h1>

      <div className="flex gap-2">
        {(["users", "subscriptions", "payments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm capitalize ${
              tab === t ? "bg-brand text-ink" : "glass-card text-ink-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-x-auto p-4">
        <table className="w-full text-sm">
          <tbody>
            {data.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="py-2 pr-4">{row.id}</td>
                <td className="py-2 pr-4">{row.email ?? row.plan ?? row.status}</td>
                {tab === "subscriptions" && (
                  <td className="py-2">
                    <select
                      defaultValue={row.plan}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => overridePlan(row.id, e.target.value)}
                      className="rounded-lg border border-line bg-canvas-subtle text-ink placeholder:text-ink-secondary px-2 py-1"
                    >
                      {["free", "starter", "pro", "business"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && <p className="text-ink-secondary">No records.</p>}
      </div>
    </div>
  );
}
