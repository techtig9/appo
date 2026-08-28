import assert from "node:assert/strict";

type Activity = { id: string; createdAt: string };
function sortNewest(items: Activity[]) { return [...items].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); }
function recentCount(items: Activity[], now: number) { return items.filter(item => now - new Date(item.createdAt).getTime() <= 24 * 60 * 60 * 1000).length; }

const now = Date.parse("2026-08-15T12:00:00Z");
const items = sortNewest([
  { id: "old", createdAt: "2026-08-10T12:00:00Z" },
  { id: "new", createdAt: "2026-08-15T11:00:00Z" },
]);
assert.equal(items[0].id, "new");
assert.equal(recentCount(items, now), 1);
console.log("activity tests passed");
