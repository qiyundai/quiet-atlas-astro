# Website reporting

Console v0.3.0 adds the public website to the same protected operations workspace.
The console verifies the owner before calling the existing private ops service's
`getWebsite` method with a server-created actor and the `quiet-atlas` resource.
The browser can select only 24 hours, 7 days or 30 days. Local preview never
contacts the public website or production analytics.

The ops Worker queries Cloudflare Web Analytics using its account-restricted
analytics read secret and privately configured `QUIET_ATLAS_RUM_SITE_TAG`. The
query aggregates page views, visits and LCP/INP/CLS rating counts, excluding
detected bots. It requests no visitor identifiers, paths, referrers or geographic
breakdowns. Neither the read credential nor site identifier reaches the browser.
Empty traffic rows report zero views; absent performance samples remain unknown.
Cloudflare sampling, blocked browsers and the start of collection limit coverage.
Visits do not measure unique people or game concurrency.

The public Astro build prerenders `/build.json`, containing only schema version,
public source commit (`CF_PAGES_COMMIT_SHA`) and build time. The console probes
that fixed URL with a three-second limit, a four-KiB body limit and a strict
field allowlist. It shows the build currently served by the website. It cannot
claim to show failed deployment attempts or deployment time; those remain in
Cloudflare. Missing or malformed metadata is visibly unavailable.

For a manual Pages publish, set `CF_PAGES_COMMIT_SHA` to the checked source HEAD
before `npm run build`. Verify the published metadata matches that source after
publishing. Account identifiers and operational configuration belong in private
deployment files, not this public repository.

Validation covers signed owner access, fixed resource and actor context, allowed
windows, query injection rejection, upstream failure isolation, response-field
redaction and bounded publication probes. The existing CSP hash generation and
owner protection apply to the new page and API.
