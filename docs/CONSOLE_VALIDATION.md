# Console foundation validation — 2026-10-08

Local environment: Windows, Node v24.11.1. Root public Astro dependencies were
installed from the existing lockfile; console dependencies were installed from
their own lockfile. Console pins Astro 7.3.8, jose 6.2.12, Wrangler 4.149.0 and
Miniflare 5.20261006.1-alpha. Root public Astro remains unchanged.

## Completed local checks

- `npm run validate` in `apps/console`: generated actual binding/runtime types,
  Worker/client TypeScript, eight static routes, nine tests and Wrangler dry run
  all passed. Worker bundle: 43.94 KiB / 12.28 KiB gzip; 20 static files.
- Signed owner JWT accepted. Wrong owner, tampered signature, old audience,
  wrong issuer, expired/not-yet-valid token and invalid subject rejected.
- Actual workerd plus actual built assets: anonymous and forged requests denied
  on pages, image and APIs; signed owner can read the eight routes, image and
  session API. Unknown APIs return JSON 404; POST returns 405. Blank production
  auth configuration returns 503, including for static assets.
- Private health binding tests: source failure is isolated; malformed/oversized
  responses and a never-completing source are bounded. Arbitrary personal data,
  upstream secrets and raw error bodies do not enter the snapshot.
- Local exemption only works for explicitly configured loopback URLs; spoofed
  forwarded-host and a public hostname cannot enable it. Local probes never
  call production. Copied brand logo bytes match the approved public asset.
- Built JS/CSS are external, compatible with the strict CSP. Browser testing
  caught Astro's default small-script inlining; it was disabled and regression
  coverage added before final verification.
- `npm audit --audit-level=high` in `apps/console`: zero vulnerabilities.
- Root `npm run build`: passed. Existing root image/prerender warnings remain;
  no public-site source, dependency lockfile or deployment setting was changed.
- Production preflight with missing/incomplete private settings: rejected
  deployment as intended. Owner/account details remain outside the public source.

## Browser verification

Ran the actual local Worker with `wrangler dev --env local --port 8810`.
Owner session identifies **Local preview · services disconnected**. Overview
refresh completes, updates the checked time and reports disconnected sources
honestly. Game navigation and the King's existing admin destination were
verified. At a 390×844 browser viewport, the available content width and document
width both measured 375 pixels (no horizontal overflow). Viewport override was
reset after the check. Screenshots are local preview evidence, not live data.

![Desktop local preview](console-preview-desktop.png)

![Mobile local preview](console-preview-mobile.png)

## Live deployment and acceptance

Deployed on 2026-10-08 (Vancouver; 2026-10-09 UTC) at
**https://admin.quietatlas.io/**. Worker version:
`8fe09ea7-7968-454d-ba8d-c8f731fc316e`.

- User approved the owner-only Access application. Saved app protects all paths,
  reuses the existing exact-owner policy, has a 24-hour session and HTTP-only
  cookies. Its distinct audience and owner settings are private Worker secrets;
  the ignored local deployment file contains the reviewed configuration.
- First publish correctly rejected missing required secrets. The deploy helper
  now supplies those secrets in the initial publish using Wrangler's
  `--secrets-file`, then removes its temporary private file in a finally block.
  No secret value appears in command arguments or public source.
- Anonymous requests to `/`, a game page, logo, built JS and CSS, session,
  overview and unknown API all returned 302 to Access. A forged JWT with a
  spoofed loopback forwarded host also returned 302. Direct workers.dev HTML
  and logo returned 404. Preview origins stay disabled in configuration.
- Existing GitHub owner sign-in opened the actual console with **Owner ·
  Production**. Session API populated that label; overview API populated the
  manual availability results. Game workspace links retain the existing King's
  and Darts admin destinations. Infrastructure and activity pages render with
  their unconnected reporting labels. Browser error/warning capture was empty.
- Live Darts signaling and the public site responded. Nomadic Hearth is not
  connected. King's `/health` check failed independently; the previously
  inspected game revision has no `/health` route in its API entrypoint. This
  result does not establish a game outage or DB readiness. Connect a supported
  private summary/health contract in the owning game before claiming readiness.
- A bounded live tail observed a schema-v1 `console_request` event for an owner
  overview refresh, status 200, duration 22 ms. Only the fixed event fields were
  printed; raw tail request metadata stayed in memory. Persistent Workers Logs
  are configured; retention and admin audit persistence remain future work.
- Public `https://quietatlas.io/` returned 200 after deployment. Public-site
  code/deployment settings and game backends/admission limits were unchanged.

The live desktop screenshot is retained in the task's private local handoff,
outside this public repository. The mobile evidence above is from the local
Worker; a live phone-width recheck could not be verified because the browser
viewport override did not take effect on that tab.

## Hosted validation

GitHub Actions run `37868141089` passed on `de1a03d`: Linux clean install,
console validation (nine tests), dependency audit and public-site build. This
repository's hosted runner is available; the earlier game-repository budget
blocker does not apply to this verified run. The Windows lockfile's missing
optional native dependencies were repaired using the runner's npm 11.19.0.
Cloudflare's public-site branch preview also passed; it is the existing website,
not the console. Check the PR's latest commit checks when continuing.
