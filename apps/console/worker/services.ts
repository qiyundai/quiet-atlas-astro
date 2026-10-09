import { resources } from '../shared/registry';
import type { Overview, Resource, ServiceStatus } from '../shared/contracts';

const TIMEOUT_MS = 3000;
const MAX_HEALTH_BYTES = 4096;

async function boundedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Missing health response');
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_HEALTH_BYTES) throw new Error('Oversized health response');
      chunks.push(part.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const output = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(output));
}

export async function probe(resource: Resource, env: Cloudflare.Env): Promise<ServiceStatus> {
  const checkedAt = new Date().toISOString();
  const base: ServiceStatus = {
    resourceId: resource.id, availability: 'unknown', checkedAt, latencyMs: null,
    evidence: 'not-connected', detail: 'Service status has not been connected.', monitoring: 'pending'
  };
  // Local development never calls production services or sites.
  if (env.ENVIRONMENT === 'local' || resource.id === 'nomadic-hearth') return base;
  const binding = resource.id === 'kings-search' ? env.KINGS_API : resource.id === 'darts-vs-squirts' ? env.DARTS_SIGNALING : undefined;
  if (resource.kind === 'game' && !binding) return base;
  const started = performance.now();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = (async () => {
    const response = resource.id === 'quiet-atlas'
      ? await fetch('https://quietatlas.io/', { method: 'HEAD', redirect: 'manual', signal: controller.signal })
      : await binding!.fetch(new Request('https://console-service.internal/health', { signal: controller.signal }));
    try {
      if (!response.ok) throw new Error('Unavailable service');
      if (resource.kind === 'game') {
        const data = await boundedJson(response);
        if (!data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) throw new Error('Invalid health response');
      }
      return true;
    } finally { await response.body?.cancel().catch(() => {}); }
  })();
  try {
    await Promise.race([operation, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('Probe timed out')); }, TIMEOUT_MS);
    })]);
    return {
      ...base, availability: 'reachable', latencyMs: Math.round(performance.now() - started),
      evidence: resource.kind === 'game' ? 'health-endpoint' : 'public-website',
      detail: resource.kind === 'game' ? 'The service responds. Gameplay and database readiness are not yet measured.' : 'The public website responds. Visitor analytics are not yet connected.'
    };
  } catch {
    return { ...base, availability: 'unavailable', evidence: resource.kind === 'game' ? 'health-endpoint' : 'public-website',
      latencyMs: Math.round(performance.now() - started), detail: 'The availability check did not complete successfully.' };
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

export async function overview(env: Cloudflare.Env): Promise<Overview> {
  const results = await Promise.allSettled(resources.map(resource => probe(resource, env)));
  const checkedAt = new Date().toISOString();
  return {
    schemaVersion: 1, checkedAt, environment: env.ENVIRONMENT,
    resources: results.map((result, index) => result.status === 'fulfilled' ? result.value : {
      resourceId: resources[index].id, availability: 'unknown', checkedAt, latencyMs: null,
      evidence: 'not-connected', detail: 'Service status could not be checked.', monitoring: 'pending'
    })
  };
}
