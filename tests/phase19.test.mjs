import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(`${root}/${p}`, 'utf8');

assert.ok(existsSync(`${root}/src/lib/release-artifact.ts`));
assert.match(read('src/lib/release-artifact.ts'), /app-releases/);
assert.match(read('src/lib/release-artifact.ts'), /sha256/);
assert.match(read('src/lib/release-artifact.ts'), /includes\(\"\.\.\"\)/); // path traversal is explicitly guarded
assert.match(read('src/app/api/deploy/web/route.ts'), /artifact_checksum/);
assert.match(read('src/app/api/deploy/web/route.ts'), /app-releases/);
assert.match(read('src/app/api/apps/[id]/releases/[version]/download/route.ts'), /getSignedReleaseUrl/);
assert.match(read('supabase/phase-19-migration.sql'), /app-releases/);
assert.match(read('supabase/phase-19-migration.sql'), /public = false/);
// Was: /Charge only after/ — that comment described charging AFTER the
// generation succeeded, which let two concurrent requests both pass the
// balance check and both run while only one was paid for. The route now
// charges atomically first (consume_credits) and refunds on failure, so
// the invariant this line protects is "credits move through the ledger",
// not "credits move last".
assert.match(read('src/app/api/generate/route.ts'), /chargeCredits/);
assert.match(read('src/app/api/generate/route.ts'), /refundCredits/);
assert.doesNotMatch(read('src/app/api/generate/route.ts'), /deductCredits/);
assert.match(read('src/app/api/apps/[id]/edit/route.ts'), /createReleaseArtifact/);
console.log('Phase 19 structural tests: 13 passed, 0 failed');
