import { boundedJson } from './services';

export async function lacunaApi(request: Request, env: Cloudflare.Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== '/api/apps/lacuna') return null;
  if (request.method !== 'GET') return new Response(null, {status: 405, headers: {Allow:'GET'}});
  if (url.search) return new Response(null, {status: 400});
  try {
    if (env.ENVIRONMENT !== 'production' || !env.LACUNA_OPS) throw Error();
    const response = await env.LACUNA_OPS.fetch('https://console-service.internal/summary', {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) { await response.body?.cancel(); throw Error(); }
    const raw = await boundedJson(response) as Record<string, unknown>;
    if (raw.version !== 1 || typeof raw.healthy !== 'boolean' || typeof raw.checkedAt !== 'string' ||
        !Number.isFinite(Date.parse(raw.checkedAt))) throw Error();
    const number = (key: string) => {
      const value = raw[key];
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw Error();
      return value;
    };
    return Response.json({
      checkedAt: new Date(raw.checkedAt).toISOString(), healthy: raw.healthy,
      lastMaintenance: raw.lastMaintenance === null ? null : number('lastMaintenance'),
      paidAccounts: number('paidAccounts'), syncBytes: number('syncBytes'), syncLimitBytes: number('syncLimitBytes'),
      signInAttempts: number('signInAttempts'), budgetMicros: number('budgetMicros'), budgetLimitMicros: number('budgetLimitMicros')
    });
  } catch {
    return Response.json({error:'summary_unavailable'}, {status:503});
  }
}
