# AI Provider Failover Update

## Provider order

Appo now routes app generation and AI project edits through this order:

1. Groq
2. Cerebras
3. OpenRouter
4. Anthropic Claude — only when Appo classifies the task as large/complex and `ANTHROPIC_API_KEY` is configured.

Claude is optional. If it is not configured, Appo continues with the configured free/low-cost providers and does not require a Claude key.

## Failover behavior

Provider requests automatically move to the next configured provider when a provider is unavailable, rate-limited, quota-limited, overloaded, times out, or returns a transient 5xx error.

## Large-task detection

Appo considers a task large/complex when it combines signals such as imported source, large source context, many screens, long requirements, backend/database requirements, authentication, or file storage.

## Environment variables

- `GROQ_API_KEY` / `GROQ_MODEL`
- `CEREBRAS_API_KEY` / `CEREBRAS_MODEL`
- `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`
- `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` (optional)
- `ANTHROPIC_MAX_TOKENS` (optional)

The previous Gemini generation dependency is no longer required for the Appo generation/edit/chatbot flows.
