export interface BuildEventPayload {
  appId: string;
  appName: string;
  event: "generation_complete" | "build_queued" | "build_failed";
  timestamp: string;
}

/** Pure payload builder — testable offline. The actual fetch() needs network. */
export function buildNotificationPayload(
  appId: string,
  appName: string,
  event: BuildEventPayload["event"]
): BuildEventPayload {
  return { appId, appName, event, timestamp: new Date().toISOString() };
}

export async function dispatchWebhookNotification(webhookUrl: string, payload: BuildEventPayload): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch (err) {
    // Never let a failed notification break the underlying build/generation flow.
    console.error("Webhook notification failed", err);
    return false;
  }
}
