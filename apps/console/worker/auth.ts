import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type { ConsoleActor } from '../shared/contracts';

export class AccessError extends Error {
  constructor(public status: 401 | 403 | 503) { super('Access denied'); }
}
const keysets = new Map<string, JWTVerifyGetKey>();
const loopback = new Set(['localhost', '127.0.0.1', '[::1]']);

export async function authenticate(request: Request, env: Cloudflare.Env): Promise<ConsoleActor> {
  if (env.ENVIRONMENT === 'local' && loopback.has(new URL(request.url).hostname)) {
    return { subject: 'local-owner', role: 'owner' };
  }
  if (!env.ACCESS_AUD || !env.OWNER_EMAIL || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN)) {
    throw new AccessError(503);
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16384) throw new AccessError(401);
  let keyset = keysets.get(env.ACCESS_TEAM_DOMAIN);
  if (!keyset) {
    keyset = createRemoteJWKSet(new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`), {
      timeoutDuration: 3000, cooldownDuration: 30000, cacheMaxAge: 600000
    });
    keysets.set(env.ACCESS_TEAM_DOMAIN, keyset);
  }
  return verifyOwner(token, env, keyset);
}

export async function verifyOwner(token: string, env: Pick<Cloudflare.Env, 'ACCESS_AUD' | 'ACCESS_TEAM_DOMAIN' | 'OWNER_EMAIL'>, keyset: JWTVerifyGetKey): Promise<ConsoleActor> {
  try {
    const { payload } = await jwtVerify(token, keyset, {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`, audience: env.ACCESS_AUD,
      algorithms: ['RS256'], requiredClaims: ['exp', 'iat', 'sub', 'email']
    });
    if (typeof payload.email !== 'string' || payload.email.toLowerCase() !== env.OWNER_EMAIL.toLowerCase()) {
      throw new AccessError(403);
    }
    if (typeof payload.sub !== 'string' || !payload.sub || payload.sub.length > 256) throw new AccessError(403);
    return { subject: payload.sub, role: 'owner' };
  } catch (error) {
    if (error instanceof AccessError) throw error;
    throw new AccessError(401);
  }
}
