import { appUrl, esc, p, renderLayout, renderText, rendered, securityFacts } from "../render";
import type { RenderedEmail, SecurityContext } from "../types";

/**
 * Every transactional email Appo can send, in one file.
 *
 * Each export is a pure function returning { subject, html, text }, so the
 * copy is reviewable and testable without a mail provider, a database or a
 * running app. Templates that exist but are not yet wired to a trigger are
 * marked — they are prepared, not fired, so Appo does not spam.
 */

const SECURITY_FOOTER = "If this wasn't you, change your password immediately and review your active sessions.";

// ============================================================
// Authentication & account security
// ============================================================

export function welcomeEmail(params: { name?: string | null }): RenderedEmail {
  const greeting = params.name ? `Welcome, ${esc(params.name)}` : "Welcome to Appo";
  const lines = [
    "Your account is ready. Appo turns a plain-language description into a complete, runnable app — then helps you refine and ship it.",
    "A good first step is to open the AI Builder and describe the app you have in mind in a sentence or two. Or start from a template and change it from there.",
  ];

  return rendered(
    "Welcome to Appo — your account is ready",
    renderLayout({
      preheader: "Describe an app, and Appo builds it.",
      heading: greeting,
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Open your dashboard", href: appUrl("/dashboard") },
      footerNote: "You're receiving this because you created an Appo account.",
    }),
    renderText({
      heading: greeting,
      lines,
      button: { label: "Open your dashboard", href: appUrl("/dashboard") },
      footerNote: "You're receiving this because you created an Appo account.",
    })
  );
}

export function signupConfirmationEmail(params: { confirmUrl: string }): RenderedEmail {
  const lines = [
    "Confirm your email address to finish setting up your Appo account.",
    "This link expires in 24 hours. If you didn't sign up for Appo, you can ignore this email — no account will be created.",
  ];
  return rendered(
    "Confirm your Appo email address",
    renderLayout({
      preheader: "One click to finish setting up your account.",
      heading: "Confirm your email address",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Confirm email", href: params.confirmUrl },
    }),
    renderText({ heading: "Confirm your email address", lines, button: { label: "Confirm email", href: params.confirmUrl } })
  );
}

/**
 * One template covers both password and Google sign-in. `provider` changes
 * the copy, not the shape — sending two different "you signed in" mails for
 * what is one logical event is exactly the duplication to avoid.
 */
export function loginAlertEmail(params: {
  name?: string | null;
  provider: "password" | "google";
  isNewDevice?: boolean;
  context: SecurityContext;
}): RenderedEmail {
  const providerLabel = params.provider === "google" ? "Google" : "email and password";
  const heading = params.isNewDevice ? "New sign-in to your Appo account" : "You signed in to Appo";
  const lines = [
    `${params.name ? `Hi ${params.name}, y` : "Y"}our Appo account was just accessed using ${providerLabel}.`,
    params.isNewDevice
      ? "We haven't seen this device or browser before, so we're letting you know."
      : "If this was you, no action is needed.",
  ];

  const facts = securityFacts(params.context);
  facts.unshift({ label: "Method", value: params.provider === "google" ? "Google sign-in" : "Password sign-in" });

  return rendered(
    params.isNewDevice ? "New sign-in to your Appo account" : "Security alert: new Appo sign-in",
    renderLayout({
      preheader: `Signed in with ${providerLabel}.`,
      heading,
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      facts,
      button: { label: "Review account security", href: appUrl("/dashboard/settings") },
      footerNote: SECURITY_FOOTER,
    }),
    renderText({
      heading,
      lines,
      facts,
      button: { label: "Review account security", href: appUrl("/dashboard/settings") },
      footerNote: SECURITY_FOOTER,
    })
  );
}

export function passwordResetEmail(params: { resetUrl: string; context: SecurityContext }): RenderedEmail {
  const lines = [
    "We received a request to reset the password on your Appo account.",
    "This link expires in 60 minutes and can only be used once. If you didn't request it, you can safely ignore this email — your password will not change.",
  ];
  return rendered(
    "Reset your Appo password",
    renderLayout({
      preheader: "A password reset was requested for your account.",
      heading: "Reset your password",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      facts: securityFacts(params.context),
      button: { label: "Choose a new password", href: params.resetUrl },
    }),
    renderText({
      heading: "Reset your password",
      lines,
      facts: securityFacts(params.context),
      button: { label: "Choose a new password", href: params.resetUrl },
    })
  );
}

export function passwordChangedEmail(params: { context: SecurityContext }): RenderedEmail {
  const lines = [
    "The password on your Appo account was just changed.",
    "If you made this change, nothing further is needed.",
  ];
  return rendered(
    "Your Appo password was changed",
    renderLayout({
      preheader: "Your account password was updated.",
      heading: "Your password was changed",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      facts: securityFacts(params.context),
      button: { label: "Review account security", href: appUrl("/dashboard/settings") },
      footerNote: "If you did not make this change, contact support immediately — your account may be compromised.",
    }),
    renderText({
      heading: "Your password was changed",
      lines,
      facts: securityFacts(params.context),
      footerNote: "If you did not make this change, contact support immediately.",
    })
  );
}

export function emailChangedEmail(params: { previousEmail: string; newEmail: string }): RenderedEmail {
  const lines = [
    `The email address on your Appo account was changed from ${params.previousEmail} to ${params.newEmail}.`,
    "This notice is sent to both addresses so a change can never go unnoticed at the old one.",
  ];
  return rendered(
    "Your Appo email address was changed",
    renderLayout({
      preheader: "The email address on your account was updated.",
      heading: "Your email address was changed",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      footerNote: "If you did not make this change, contact support immediately.",
    }),
    renderText({ heading: "Your email address was changed", lines, footerNote: "If you did not make this change, contact support immediately." })
  );
}

export function accountDeletionEmail(params: { name?: string | null }): RenderedEmail {
  const lines = [
    `${params.name ? `${params.name}, y` : "Y"}our Appo account and its projects have been permanently deleted, as requested.`,
    "Nothing further is required from you. Billing has been stopped and no more charges will be made.",
    "If you deleted your account by mistake, contact support — we may be able to help within a short window, but deletion is designed to be final.",
  ];
  return rendered(
    "Your Appo account has been deleted",
    renderLayout({
      preheader: "Your account and data have been removed.",
      heading: "Your account has been deleted",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
    }),
    renderText({ heading: "Your account has been deleted", lines })
  );
}

// ============================================================
// Billing
// ============================================================

export function subscriptionStartedEmail(params: { plan: string; credits: number }): RenderedEmail {
  const lines = [
    `Your ${params.plan} plan is now active.`,
    `${params.credits.toLocaleString("en-GB")} credits have been added to your account for this billing period.`,
  ];
  return rendered(
    `Your Appo ${params.plan} plan is active`,
    renderLayout({
      preheader: `${params.plan} plan activated.`,
      heading: `Your ${params.plan} plan is active`,
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "View billing", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: `Your ${params.plan} plan is active`, lines, button: { label: "View billing", href: appUrl("/dashboard/billing") } })
  );
}

export function paymentSucceededEmail(params: { plan: string; amount: string }): RenderedEmail {
  const lines = [`We've received your payment of ${params.amount} for the Appo ${params.plan} plan.`, "Your receipt is available from the billing page."];
  return rendered(
    "Payment received — thank you",
    renderLayout({
      preheader: "Your Appo payment was successful.",
      heading: "Payment received",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "View billing", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: "Payment received", lines })
  );
}

export function paymentFailedEmail(params: { plan: string }): RenderedEmail {
  const lines = [
    `We couldn't take payment for your Appo ${params.plan} plan.`,
    "Generation is paused until the payment is resolved. Updating your payment method restores access immediately.",
  ];
  return rendered(
    "Action needed: your Appo payment failed",
    renderLayout({
      preheader: "Update your payment method to restore your plan.",
      heading: "Your payment failed",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Update payment method", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: "Your payment failed", lines, button: { label: "Update payment method", href: appUrl("/dashboard/billing") } })
  );
}

export function subscriptionCancelledEmail(params: { plan: string; endsAt?: string | null }): RenderedEmail {
  const lines = [
    `Your Appo ${params.plan} subscription has been cancelled.`,
    params.endsAt
      ? `You keep paid access until ${params.endsAt}, after which the account moves to the Free plan.`
      : "Your account has moved to the Free plan.",
    "Your projects stay exactly where they are — nothing is deleted.",
  ];
  return rendered(
    "Your Appo subscription has been cancelled",
    renderLayout({
      preheader: "Your subscription has been cancelled.",
      heading: "Subscription cancelled",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Reactivate", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: "Subscription cancelled", lines })
  );
}

export function subscriptionRenewingEmail(params: { plan: string; renewsOn: string; amount: string }): RenderedEmail {
  const lines = [`Your Appo ${params.plan} plan renews on ${params.renewsOn} for ${params.amount}.`, "No action is needed — this is a courtesy reminder."];
  return rendered(
    `Your Appo ${params.plan} plan renews on ${params.renewsOn}`,
    renderLayout({
      preheader: "Upcoming renewal.",
      heading: "Upcoming renewal",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Manage subscription", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: "Upcoming renewal", lines })
  );
}

export function lowCreditsEmail(params: { creditsRemaining: number; plan: string }): RenderedEmail {
  const lines = [
    `You have ${params.creditsRemaining.toLocaleString("en-GB")} credits left on your Appo ${params.plan} plan.`,
    "That may not be enough for another full app generation. Upgrading adds credits immediately.",
  ];
  return rendered(
    "You're running low on Appo credits",
    renderLayout({
      preheader: `${params.creditsRemaining} credits remaining.`,
      heading: "You're running low on credits",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "View plans", href: appUrl("/dashboard/billing") },
    }),
    renderText({ heading: "You're running low on credits", lines })
  );
}

// ============================================================
// Product events
// ============================================================

export function generationCompletedEmail(params: { appName: string; appId: string; summary: string }): RenderedEmail {
  const lines = [`${params.appName} has finished generating and is ready to preview.`, params.summary];
  return rendered(
    `${params.appName} is ready`,
    renderLayout({
      preheader: "Your generated app is ready to preview.",
      heading: `${esc(params.appName)} is ready`,
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Open project", href: appUrl(`/dashboard/apps/${params.appId}`) },
    }),
    renderText({ heading: `${params.appName} is ready`, lines, button: { label: "Open project", href: appUrl(`/dashboard/apps/${params.appId}`) } })
  );
}

export function deploymentCompletedEmail(params: { appName: string; url: string; version: number }): RenderedEmail {
  const lines = [`Version ${params.version} of ${params.appName} is live.`];
  return rendered(
    `${params.appName} is live`,
    renderLayout({
      preheader: "Your deployment succeeded.",
      heading: `${esc(params.appName)} is live`,
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      facts: [{ label: "URL", value: params.url }, { label: "Version", value: String(params.version) }],
      button: { label: "Open deployment", href: params.url },
    }),
    renderText({ heading: `${params.appName} is live`, lines, button: { label: "Open deployment", href: params.url } })
  );
}

export function deploymentFailedEmail(params: { appName: string; reason: string }): RenderedEmail {
  const lines = [`The deployment of ${params.appName} did not complete.`, params.reason, "No credits were charged for the failed deployment."];
  return rendered(
    `Deployment failed: ${params.appName}`,
    renderLayout({
      preheader: "Your deployment did not complete.",
      heading: "Deployment failed",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "View deployments", href: appUrl("/dashboard/deployments") },
    }),
    renderText({ heading: "Deployment failed", lines })
  );
}

export function teamInvitationEmail(params: {
  inviterName: string;
  appName: string;
  role: string;
  acceptUrl: string;
}): RenderedEmail {
  const lines = [
    `${params.inviterName} invited you to collaborate on "${params.appName}" in Appo as a ${params.role}.`,
    "This invitation expires in 7 days.",
  ];
  return rendered(
    `${params.inviterName} invited you to collaborate on ${params.appName}`,
    renderLayout({
      preheader: `You've been invited as a ${params.role}.`,
      heading: "You've been invited to collaborate",
      bodyHtml: lines.map((line) => p(esc(line))).join(""),
      button: { label: "Accept invitation", href: params.acceptUrl },
      footerNote: "If you weren't expecting this invitation, you can ignore this email.",
    }),
    renderText({
      heading: "You've been invited to collaborate",
      lines,
      button: { label: "Accept invitation", href: params.acceptUrl },
    })
  );
}
