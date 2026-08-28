"use client";

import { useEffect, useMemo, useState } from "react";
import { initializePaddle, type Paddle } from "@paddle/paddle-js";
import { PLANS } from "@/lib/plans";
import { getLowCreditWarning } from "@/lib/account-lifecycle";
import { getCreditStatus, getUsagePercent } from "@/lib/billing";
import type { PlanId } from "@/lib/supabase/types";

interface SubscriptionState {
  plan: PlanId;
  credits_remaining: number;
  credits_granted: number;
  status: string;
  renews_at?: string | null;
}

interface BillingConfig {
  clientToken: string | null;
  environment: "sandbox" | "production";
  prices: Record<string, string | null>;
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/subscription").then((r) => r.json()),
      fetch("/api/billing/config").then((r) => r.json()),
    ]).then(([subscriptionData, configData]) => {
      setSubscription(subscriptionData.subscription ?? null);
      setConfig(configData);
    }).catch(() => setMessage("Couldn't load billing details. Please refresh."));
  }, []);

  useEffect(() => {
    if (!config?.clientToken) return;
    initializePaddle({
      environment: config.environment,
      token: config.clientToken,
      eventCallback: () => {
        // Subscription state is authoritative in Supabase and updated by Paddle webhooks.
      },
    }).then((instance) => setPaddle(instance ?? null)).catch(() => setPaddle(null));
  }, [config]);

  const usedCredits = subscription ? Math.max(0, subscription.credits_granted - subscription.credits_remaining) : 0;
  const usedPct = subscription ? getUsagePercent(subscription.credits_remaining, subscription.credits_granted) : 0;
  const creditStatus = subscription ? getCreditStatus(subscription.credits_remaining, subscription.credits_granted) : "healthy";
  const warning = subscription ? getLowCreditWarning(subscription.credits_remaining, subscription.credits_granted) : null;

  const planCards = useMemo(() => (["starter", "pro", "business"] as const).map((id) => ({ ...PLANS[id], id })), []);

  async function openCheckout(plan: Exclude<PlanId, "free">) {
    setMessage("");
    setLoadingPlan(plan);
    const priceId = config?.prices?.[plan];
    try {
      if (!paddle || !priceId) {
        setMessage("Checkout isn't configured yet. Add the Paddle client token and price IDs in your environment settings.");
        return;
      }
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: { displayMode: "overlay", theme: "dark" },
      });
    } finally {
      setLoadingPlan(null);
    }
  }

  async function cancelSubscription() {
    if (!confirm("Cancel your subscription? You'll keep access until the end of this billing period, then move to Free.")) return;
    setCancelling(true);
    setMessage("");
    try {
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't cancel your subscription.");
      setMessage(data.message);
      setSubscription((prev) => prev ? { ...prev, status: data.status } : prev);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Network error — please try again.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="fade-in space-y-6 pb-10">
      <div>
        <p className="text-sm font-medium text-violet-300">Workspace billing</p>
        <h1 className="mt-1 text-3xl font-semibold text-white">Plans & usage</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">Manage your Appo plan, monitor AI credits, and upgrade when your projects need more power.</p>
      </div>

      {message && <div className="glass-card border-violet/30 p-4 text-sm text-slate-200">{message}</div>}

      {warning?.show && <div className="glass-card border-violet/30 p-4 text-sm text-violet-200">{warning.message}</div>}

      <section className="glass-card p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-slate-400">Current plan</p>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">{subscription ? PLANS[subscription.plan].label : "Loading…"}</h2>
              {subscription && <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize text-slate-300">{subscription.status.replace("_", " ")}</span>}
            </div>
          </div>
          {subscription?.renews_at && <div className="text-sm text-slate-400">Renews <span className="text-white">{new Date(subscription.renews_at).toLocaleDateString()}</span></div>}
        </div>
        {subscription && <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm"><span className="text-slate-400">AI credits used</span><span className="text-white">{usedCredits.toLocaleString()} / {subscription.credits_granted.toLocaleString()}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-white/5"><div className={`h-full rounded-full ${creditStatus === "critical" ? "bg-fuchsia-400" : creditStatus === "low" ? "bg-amber-400" : "bg-violet"}`} style={{ width: `${usedPct}%` }} /></div>
          <div className="mt-2 flex justify-between text-xs text-slate-500"><span>{usedPct}% used</span><span>{subscription.credits_remaining.toLocaleString()} remaining</span></div>
        </div>}
      </section>

      <section>
        <div className="mb-4"><h2 className="text-xl font-semibold text-white">Choose your plan</h2><p className="mt-1 text-sm text-slate-400">Upgrade instantly through Paddle. Your Appo subscription is updated after the verified billing webhook.</p></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {planCards.map((plan) => {
            const current = subscription?.plan === plan.id;
            const popular = plan.id === "pro";
            return <div key={plan.id} className={`glass-card relative flex flex-col p-6 ${popular ? "border-violet/50 shadow-lg shadow-violet/5" : ""}`}>
              {popular && <span className="absolute right-5 top-5 rounded-full bg-violet/15 px-2.5 py-1 text-xs font-medium text-violet-200">Most popular</span>}
              <h3 className="text-lg font-semibold text-white">{plan.label}</h3>
              <p className="mt-3 text-3xl font-bold text-white">${plan.priceMonthlyCents / 100}<span className="text-sm font-normal text-slate-500">/month</span></p>
              <p className="mt-2 text-sm text-slate-400">{plan.monthlyCredits.toLocaleString()} AI credits every billing cycle.</p>
              <div className="mt-5 space-y-2 text-sm text-slate-300">
                {Object.entries(plan.features).filter(([, enabled]) => enabled).slice(0, 6).map(([feature]) => <p key={feature}>✓ {feature.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</p>)}
              </div>
              <button disabled={current || loadingPlan !== null} onClick={() => openCheckout(plan.id)} className="btn-accent mt-6 w-full text-sm disabled:cursor-not-allowed disabled:opacity-50">
                {current ? "Current plan" : loadingPlan === plan.id ? "Opening checkout…" : "Choose plan"}
              </button>
            </div>;
          })}
        </div>
      </section>

      {subscription && subscription.plan !== "free" && <section className="glass-card p-6">
        <h2 className="font-semibold text-white">Manage subscription</h2>
        {subscription.status === "cancelled" ? <p className="mt-2 text-sm text-slate-400">Cancellation is scheduled. You'll keep your current plan until the billing period ends.</p> : <>
          <p className="mt-2 text-sm text-slate-400">Canceling stops future renewal. Your current plan remains active until the end of the paid period.</p>
          <button onClick={cancelSubscription} disabled={cancelling} className="btn-outline mt-4 text-sm text-fuchsia-300">{cancelling ? "Cancelling…" : "Cancel subscription"}</button>
        </>}
      </section>}
    </div>
  );
}
