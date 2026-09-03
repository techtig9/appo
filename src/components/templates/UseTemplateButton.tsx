"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * "Use this template" hands the user to the builder with the template's
 * brief pre-filled — it deliberately does NOT start a generation.
 *
 * Generating costs credits, and a single click that silently spends them
 * on a brief the user has not read is the wrong default. They review and
 * edit first, then press Generate.
 */
export function UseTemplateButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  function use() {
    setBusy(true);
    toast({
      title: `Starting from ${name}`,
      description: "Review the brief, then generate when you're ready. Nothing is charged until you do.",
      tone: "info",
    });
    router.push(`/dashboard/generator?template=${encodeURIComponent(slug)}`);
  }

  return (
    <Button onClick={use} loading={busy} loadingLabel="Opening builder…" fullWidth className="mt-5">
      Use this template
    </Button>
  );
}
