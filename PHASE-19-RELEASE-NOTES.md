# Appo Phase 19 — Production Release Artifacts & Secure Hosting Handoff

Phase 19 adds a real immutable production-artifact pipeline. Generated/edited projects are packaged as ZIP release artifacts and stored in the private `app-releases` Supabase Storage bucket. Version records now include SHA-256 checksums and artifact sizes; deployments reference the exact artifact. Owner/editor users can request short-lived signed download URLs.

This phase deliberately does not execute arbitrary generated source code inside the Next.js server. The public release page remains a safe release shell until a dedicated isolated build/runtime worker is connected. This avoids turning the SaaS server into an arbitrary-code execution environment.

Migration: `supabase/phase-19-migration.sql`.
