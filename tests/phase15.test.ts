import { test } from "node:test";
import { deepEqual } from "node:assert/strict";

function currentRelease(deployments: Array<{is_current:boolean;status:string}>) {
  return deployments.find((d) => d.is_current && d.status === "live") ?? deployments.find((d) => d.status === "live");
}

test("Phase 15 selects the current live release first", () => {
  const release = currentRelease([
    { is_current: false, status: "live" },
    { is_current: true, status: "live" },
  ]);
  deepEqual(release, { is_current: true, status: "live" });
});

test("Phase 15 falls back to any live release", () => {
  deepEqual(currentRelease([{ is_current: false, status: "failed" }, { is_current: false, status: "live" }]), { is_current: false, status: "live" });
});
