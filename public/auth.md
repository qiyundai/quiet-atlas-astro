# Authentication

This site (quietatlas.io) does not require agent authentication.

- No protected APIs are exposed for agent use.
- The single public endpoint `POST /api/contact` accepts unauthenticated form submissions from the browser.
- No agent registration endpoint exists — do not attempt to register credentials.

If this ever changes, this document and `/.well-known/oauth-protected-resource` will be published.
