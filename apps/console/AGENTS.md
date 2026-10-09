# Console implementation instructions

Before every new task inspect branch/status, preserve existing work, fetch origin,
integrate the task branch's remote counterpart and origin/main, and verify
origin/main is an ancestor of HEAD. Do not silently continue from stale sources.

Read README.md and ../../docs/CONSOLE_MIGRATION_HANDOFF.md before continuing the
migration. Keep the public site's root build/deployment independent. Preserve
the exact approved public/logo.png artwork, copied into this app without edits.

All console pages/assets/APIs must pass through owner JWT validation. Keep
assets.run_worker_first true, workers_dev/preview_urls false, distinct Access
audience, exact owner and issuer checks, and local bypass limited to loopback.
Never use a browser-supplied actor or generic upstream proxy. Keep game data and
business rules in the owning backend; use narrow private service entrypoints.

Persist backend-owned audit records before migrating admin mutations. Use typed
action allowlists, origin/CSRF checks, idempotency and backend invariant tests.
Do not expose raw credentials, account tokens, player data or upstream error
bodies through metrics/logs. Unknown data is unavailable, never a synthetic zero.

After changes run npm run validate in this directory and npm run build at the
repository root. Check actual browser rendering, mobile navigation and Access
behavior for user-facing changes. Regenerate Env types after Wrangler edits.
Do not add automatic deployment requiring a new token or assume hosted CI ran
when GitHub's Actions budget prevents jobs from starting.
