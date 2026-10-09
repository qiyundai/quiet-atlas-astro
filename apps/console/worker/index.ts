import { AccessError, authenticate } from './auth';
import { overview } from './services';
import { resources } from '../shared/registry';
import { gameApi, GameError } from './games';
import hydrationHashes from '../.generated/csp.json';

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status });
}
function protect(response: Response): Response {
  const output = new Response(response.body, response);
  output.headers.set('Cache-Control', 'private, no-store');
  output.headers.set('Vary', 'Cf-Access-Jwt-Assertion, Cookie');
  output.headers.set('X-Content-Type-Options', 'nosniff');
  output.headers.set('Referrer-Policy', 'no-referrer');
  output.headers.set('X-Frame-Options', 'DENY');
  output.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  output.headers.set('Content-Security-Policy', `default-src 'self'; script-src 'self' ${hydrationHashes.scripts.join(' ')}; style-src 'self' ${hydrationHashes.styles.join(' ')}; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`);
  return output;
}

export default {
  async fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const started = performance.now();
    let route = 'asset';
    let response: Response;
    try {
      const actor = await authenticate(request, env);
      const path = new URL(request.url).pathname;
      if (path === '/api' || path.startsWith('/api/')) {
        route = path === '/api/session' ? 'session' : path === '/api/resources' ? 'resources' : path === '/api/overview' ? 'overview' : 'unknown-api';
        const gameResponse = await gameApi(request, env, actor, requestId);
        if (gameResponse) { route = 'game-api'; response = gameResponse; }
        else if (request.method !== 'GET') response = json({ error: 'method_not_allowed', requestId }, 405);
        else if (route === 'session') response = json({ schemaVersion: 1, role: 'owner', environment: env.ENVIRONMENT, version: '0.2.0' });
        else if (route === 'resources') response = json({ schemaVersion: 1, resources });
        else if (route === 'overview') response = json(await overview(env));
        else response = json({ error: 'not_found', requestId }, 404);
      } else if (!['GET', 'HEAD'].includes(request.method)) {
        response = json({ error: 'method_not_allowed', requestId }, 405);
      } else {
        // Known King's client routes reuse the protected shell on direct navigation.
        const spaRoute = /^\/games\/kings-search\/(users|characters|campaigns|active|invite-codes|audit)(\/[^/]+)?\/?$/.test(path);
        const assetRequest = spaRoute ? new Request(new URL('/games/kings-search/', request.url), request) : request;
        response = await env.ASSETS.fetch(assetRequest);
      }
    } catch (error) {
      if (error instanceof GameError) {
        route = 'game-api';
        response = json({ ok:false,error:error.code,requestId },error.status);
      } else if (error instanceof AccessError) {
        route = 'access';
        response = json({ error: error.status === 503 ? 'access_not_configured' : 'access_denied', requestId }, error.status);
      } else {
        response = json({ error: 'request_failed', requestId }, 500);
      }
    }
    console.log(JSON.stringify({ event: 'console_request', schemaVersion: 1, requestId, route,
      status: response.status, durationMs: Math.round(performance.now() - started) }));
    const output = protect(response);
    output.headers.set('X-Request-ID', requestId);
    if (response.status === 405) output.headers.set('Allow', route === 'asset' ? 'GET, HEAD' : 'GET');
    return output;
  }
} satisfies ExportedHandler<Cloudflare.Env>;
