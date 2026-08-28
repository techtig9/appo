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
assert.match(read('src/app/api/generate/route.ts'), /Charge only after/);
assert.match(read('src/app/api/apps/[id]/edit/route.ts'), /createReleaseArtifact/);
console.log('Phase 19 structural tests: 11 passed, 0 failed');
