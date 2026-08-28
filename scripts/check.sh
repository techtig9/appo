#!/usr/bin/env bash
# Runs everything that's actually verifiable without network access / a real
# npm install: the Node test-runner unit tests, and the offline TypeScript
# check against the stub declarations in src/types/offline-check-stubs.d.ts.
#
# This is NOT a substitute for `npm run build && npm run dev` against a real
# Supabase/Gemini/Paddle setup — see README.md.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Running unit tests (node:test via tsx)"
npx tsx --test tests/*.test.ts

echo ""
echo "==> Running offline TypeScript check"
npx tsc --project tsconfig.offline-check.json

echo ""
echo "All offline checks passed."
