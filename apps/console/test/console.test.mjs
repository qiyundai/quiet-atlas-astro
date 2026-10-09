import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { Miniflare, Log, LogLevel, convertV4MiniflareOptions } from 'miniflare';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';

let worker, auth, services, keys, jwks, keyset;
const instances = [];
const env = { ENVIRONMENT: 'production', ACCESS_TEAM_DOMAIN: 'console-test.cloudflareaccess.com', ACCESS_AUD: 'console-test-audience', OWNER_EMAIL: 'owner@example.com' };
before(async () => {
  await mkdir('.test-build', { recursive: true });
  await Promise.all([
    build({ entryPoints: ['worker/index.ts'], outfile: '.test-build/worker.mjs', bundle: true, format: 'esm', platform: 'browser', target: 'es2022' }),
    build({ entryPoints: ['worker/auth.ts'], outfile: '.test-build/auth.mjs', bundle: true, format: 'esm', platform: 'node', target: 'es2022' }),
    build({ entryPoints: ['worker/services.ts'], outfile: '.test-build/services.mjs', bundle: true, format: 'esm', platform: 'node', target: 'es2022' })
  ]);
  worker = await readFile('.test-build/worker.mjs', 'utf8');
  auth = await import('../.test-build/auth.mjs');
  services = await import('../.test-build/services.mjs');
  keys = await generateKeyPair('RS256');
  const publicJwk = { ...await exportJWK(keys.publicKey), kid: 'console-test', alg: 'RS256', use: 'sig' };
  jwks = { keys: [publicJwk] };
  keyset = createLocalJWKSet(jwks);
});
after(async () => { await Promise.all(instances.map(mf => mf.dispose())); });
async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ email: env.OWNER_EMAIL, sub: 'verified-owner', iss: `https://${env.ACCESS_TEAM_DOMAIN}`, aud: env.ACCESS_AUD, iat: now, exp: now + 300, ...overrides })
    .setProtectedHeader({ alg: 'RS256', kid: 'console-test' }).sign(keys.privateKey);
}
function runtime(bindings = env, serviceBindings = {}, extraWorkers = []) {
  const mf = new Miniflare(convertV4MiniflareOptions({
    workers: [{ name: 'console-test', modules: true, script: worker, compatibilityDate: '2026-10-08', bindings,
    assets: { directory: './dist', binding: 'ASSETS', run_worker_first: true, routerConfig: { has_user_worker: true } },
    serviceBindings,
    outboundService: async request => {
      if (request.url === `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`) return Response.json(jwks);
      if (request.url === 'https://quietatlas.io/') return new Response(null, { status: 200 });
      throw new Error('Unexpected external request');
    } }, ...extraWorkers],
    log: new Log(LogLevel.ERROR)
  }));
  instances.push(mf);
  return mf;
}

test('signed owner accepted; wrong owner, signature, audience, issuer, expiry and nbf rejected', async () => {
  assert.deepEqual(await auth.verifyOwner(await token(), env, keyset), { subject: 'verified-owner', role: 'owner' });
  for (const overrides of [{ email: 'someone@example.com' }, { aud: 'legacy-admin-audience' }, { iss: 'https://attacker.example' }, { exp: 1 }, { nbf: Math.floor(Date.now() / 1000) + 1000 }, { sub: 'x'.repeat(300) }]) {
    await assert.rejects(auth.verifyOwner(await token(overrides), env, keyset));
  }
  const signed = await token();
  await assert.rejects(auth.verifyOwner(signed.slice(0, -20) + 'a'.repeat(20), env, keyset));
  await assert.rejects(auth.verifyOwner('not-a-jwt', env, keyset));
});

test('local auth exemption is limited to configured local loopback URLs', async () => {
  const local = { ...env, ENVIRONMENT: 'local', ACCESS_AUD: '' };
  for (const host of ['localhost', '127.0.0.1', '[::1]']) assert.equal((await auth.authenticate(new Request(`http://${host}/`), local)).subject, 'local-owner');
  await assert.rejects(auth.authenticate(new Request('https://admin.quietatlas.io/', { headers: { 'X-Forwarded-Host': 'localhost' } }), local));
  await assert.rejects(auth.authenticate(new Request('http://localhost/'), env));
});

test('real Worker and real built assets deny anonymous or forged access on every route', async () => {
  const mf = runtime();
  const html = await readFile('dist/index.html', 'utf8');
  const assetPaths = [...html.matchAll(/(?:src|href)="(\/_astro\/[^\"]+)"/g)].map(match => match[1]);
  assert.ok(assetPaths.length >= 2);
  for (const path of ['/', '/games/kings-search/', '/logo.png', ...assetPaths, '/api/session', '/api/overview', '/anything']) {
    const response = await mf.dispatchFetch(`https://admin.quietatlas.io${path}`);
    assert.equal(response.status, 401, `${path}: ${response.status === 401 ? '' : await response.clone().text()}`);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal((await response.json()).error, 'access_denied');
  }
  const forged = await mf.dispatchFetch('https://quiet-atlas-console.example.workers.dev/', { headers: { 'Cf-Access-Jwt-Assertion': 'forged' } });
  assert.equal(forged.status, 401);
  const wrong = await mf.dispatchFetch('https://admin.quietatlas.io/logo.png', { headers: { 'Cf-Access-Jwt-Assertion': await token({ aud: 'old-dvs-audience' }) } });
  assert.equal(wrong.status, 401);
  const outsider = await mf.dispatchFetch('https://admin.quietatlas.io/', { headers: { 'Cf-Access-Jwt-Assertion': await token({ email: 'outsider@example.com' }) } });
  assert.equal(outsider.status, 403);
});

test('valid owner can load actual pages/assets and APIs without API-to-HTML fallback', async () => {
  const mf = runtime();
  const headers = { 'Cf-Access-Jwt-Assertion': await token() };
  for (const path of ['/', '/games/kings-search/', '/games/darts-vs-squirts/', '/games/nomadic-hearth/', '/sites/quiet-atlas/', '/infrastructure/', '/activity/', '/404.html']) {
    const response = await mf.dispatchFetch(`https://admin.quietatlas.io${path}`, { headers });
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /Quiet Atlas Console/);
  }
  assert.equal((await mf.dispatchFetch('https://admin.quietatlas.io/logo.png', { headers })).status, 200);
  const session = await mf.dispatchFetch('https://admin.quietatlas.io/api/session', { headers });
  assert.equal((await session.json()).role, 'owner');
  const unknown = await mf.dispatchFetch('https://admin.quietatlas.io/api/forward?url=https://attacker.example', { headers });
  assert.equal(unknown.status, 404);
  assert.match(unknown.headers.get('content-type'), /application\/json/);
  for (const path of ['/', '/api/overview']) assert.equal((await mf.dispatchFetch(`https://admin.quietatlas.io${path}`, { method: 'POST', headers })).status, 405);
});

test('missing production auth config fails closed including assets', async () => {
  const mf = runtime({ ...env, ACCESS_AUD: '' });
  assert.equal((await mf.dispatchFetch('https://admin.quietatlas.io/logo.png')).status, 503);
});

test('private health probes isolate failure and redact arbitrary upstream data', async () => {
  const paths = [];
  const mf = runtime(env, {
    KINGS_API: async request => { paths.push(new URL(request.url).pathname); return Response.json({ ok: true, token: 'private-upstream-data', users: ['personal-record'] }); },
    DARTS_SIGNALING: async request => { paths.push(new URL(request.url).pathname); return new Response('private-error-details', { status: 503 }); }
  });
  const response = await mf.dispatchFetch('https://admin.quietatlas.io/api/overview', { headers: { 'Cf-Access-Jwt-Assertion': await token() } });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.schemaVersion, 1);
  assert.equal(data.resources.find(r => r.resourceId === 'kings-search').availability, 'reachable');
  assert.equal(data.resources.find(r => r.resourceId === 'darts-vs-squirts').availability, 'unavailable');
  assert.equal(data.resources.find(r => r.resourceId === 'nomadic-hearth').availability, 'unknown');
  assert.equal(data.resources.find(r => r.resourceId === 'quiet-atlas').availability, 'reachable');
  assert.ok(data.resources.every(r => r.monitoring === 'pending'));
  assert.doesNotMatch(JSON.stringify(data), /private-|personal-record/);
  assert.deepEqual(paths.sort(), ['/health', '/health']);
});

test('oversized, malformed and never-completing health responses are bounded', async () => {
  const resource = { id: 'kings-search', kind: 'game' };
  for (const response of [new Response('x'.repeat(5000)), new Response('not-json'), Response.json({ ok: false })]) {
    assert.equal((await services.probe(resource, { ...env, KINGS_API: { fetch: async () => response } })).availability, 'unavailable');
  }
  const started = Date.now();
  const status = await services.probe(resource, { ...env, KINGS_API: { fetch: () => new Promise(() => {}) } });
  assert.equal(status.availability, 'unavailable');
  assert.ok(Date.now() - started < 4000);
});

test('local preview makes no production health calls and preserves brand artwork', async () => {
  const mf = runtime({ ...env, ENVIRONMENT: 'local', ACCESS_AUD: '' }, {
    KINGS_API: () => { throw new Error('Local preview must not contact games'); }
  });
  const response = await mf.dispatchFetch('http://localhost/api/overview');
  assert.ok((await response.json()).resources.every(r => r.availability === 'unknown'));
  const original = await readFile('../../public/logo.png');
  assert.deepEqual(await readFile('dist/logo.png'), original);
});

test('built pages use external scripts and styles compatible with the strict CSP', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
  assert.doesNotMatch(html, /<style\b/);
  assert.match(html, /<script[^>]*\bsrc="\/_astro\/[^\"]+\.js"/);
});

test('every inline hydration script/style has an exact CSP hash and unsafe sources stay absent', async () => {
  const manifest=JSON.parse(await readFile('.generated/csp.json','utf8'));
  async function scan(path) {
    for (const item of await readdir(path,{withFileTypes:true})) {
      const child=`${path}/${item.name}`;
      if (item.isDirectory()) await scan(child);
      else if (item.name.endsWith('.html')) {
        const html=await readFile(child,'utf8');
        for (const [tag,key] of [['script','scripts'],['style','styles']]) for (const match of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)<\\/${tag}>`,'g'))) {
          if (/\bsrc=|type="application\/json"/.test(match[1]) || !match[2].trim()) continue;
          assert.ok(manifest[key].includes(`'sha256-${createHash('sha256').update(match[2]).digest('base64')}'`),child);
        }
      }
    }
  }
  await scan('dist');
  const mf=runtime();const response=await mf.dispatchFetch('https://console.test/games/kings-search/',{headers:{'Cf-Access-Jwt-Assertion':await token()}});
  const csp=response.headers.get('content-security-policy');
  for (const hash of [...manifest.scripts,...manifest.styles]) assert.ok(csp.includes(hash));
  assert.doesNotMatch(csp,/unsafe-inline|unsafe-eval|https:/);
});

test('game reads use named RPC with the verified actor, explicit stage, allowed queries and bounded failures', async () => {
  const fixture=`import {WorkerEntrypoint} from 'cloudflare:workers';
  export class Kings extends WorkerEntrypoint {
    async read(request) {if(request.actor.subject!=='verified-owner'||request.actor.role!=='owner'||request.resourceId!=='kings-search'||request.environment!==this.env.environment)throw Error('wrong actor or environment');
      if(request.query?.search==='failure')throw Error('private upstream token');
      return {status:200,body:{ok:true,data:[{id:'fixture-record',environment:this.env.environment}],total:1}};}
    async getSummary(request){if(request.actor.subject!=='verified-owner')throw Error('bad actor');return {schemaVersion:1,resourceId:request.resourceId,collectedAt:new Date().toISOString(),readiness:'ready',metrics:[{key:'totalUsers',value:2,unit:'count',window:'current',source:'fixture'}]};}
    async mutate(request){if(request.actor.subject!=='verified-owner'||request.environment!==this.env.environment)throw Error('bad actor');return {status:200,body:{ok:true,data:{action:request.action,target:request.targetId,count:request.count,key:request.idempotencyKey}}};}
    async getAudit(request){if(request.actor.subject!=='verified-owner')throw Error('bad actor');return {status:200,body:{ok:true,data:[],total:0}};}
  }
  export class Darts extends WorkerEntrypoint {
    async getMonitoring(request){if(request.actor.subject!=='verified-owner')throw Error('wrong actor');return {schemaVersion:1,resourceId:request.resourceId,environment:request.options.environment,analytics:null,errors:['analytics_not_configured']};}
    async mutate(request){if(request.actor.subject!=='verified-owner')throw Error('wrong actor');return {status:200,body:{ok:true,paused:request.action==='admission_pause'}};}
    async getAudit(request){if(request.actor.subject!=='verified-owner')throw Error('wrong actor');return {status:200,body:{ok:true,data:[]}};}
    async getInfrastructure(request){if(request.actor.subject!=='verified-owner')throw Error('wrong actor');return {schemaVersion:1,available:false,error:'analytics_not_configured'};}
  }
  export default {fetch(){return new Response('no public RPC',{status:404});}};`;
  const mf=runtime(env,{KINGS_ADMIN:{name:'kings',entrypoint:'Kings'},KINGS_STAGE:{name:'kings-stage',entrypoint:'Kings'},DARTS_OPS:{name:'darts',entrypoint:'Darts'}},[
    {name:'kings',modules:true,script:fixture,compatibilityDate:'2026-10-08',bindings:{environment:'production'}},
    {name:'kings-stage',modules:true,script:fixture,compatibilityDate:'2026-10-08',bindings:{environment:'staging'}},
    {name:'darts',modules:true,script:fixture,compatibilityDate:'2026-10-08'}]);
  const headers={'Cf-Access-Jwt-Assertion':await token(),'X-Console-Actor':'browser-forgery'};
  async function request(path,status=200,options={}) {const response=await mf.dispatchFetch('https://console.test'+path,{headers,...options});assert.equal(response.status,status,path);return response;}
  for(const path of ['/api/kings/users?limit=1&search=Fixture','/api/kings/users/fixture-record','/api/kings/characters','/api/kings/campaigns','/api/kings/active-campaigns','/api/kings/invite-codes','/api/kings/stats']) {
    const data=await (await request(path)).json();assert.equal(data.data[0].environment,'production');
  }
  const stage=await (await request('/api/kings/users?environment=staging')).json();assert.equal(stage.data[0].environment,'staging');
  for(const path of ['/api/kings/users?actor=forged','/api/kings/users?limit=1&limit=2','/api/kings/users?environment=unknown','/api/games/darts-vs-squirts/monitoring?hours=3','/api/games/darts-vs-squirts/monitoring?route=guessed','/api/games/darts-vs-squirts/monitoring?build=bad%27']) await request(path,400);
  await request('/api/kings/unsupported',404);await request('/api/kings/users',403,{method:'DELETE'});
  const commandHeaders={...headers,Origin:'https://console.test','Content-Type':'application/json','Idempotency-Key':crypto.randomUUID(),'Sec-Fetch-Site':'same-origin'};
  const command=async(path,method,body={},status=200,extraHeaders={})=>request(path,status,{method,body:JSON.stringify(body),headers:{...commandHeaders,...extraHeaders}});
  for(const [path,method,action] of [['/api/kings/users/fixture','DELETE','user_delete'],['/api/kings/characters/fixture/revive','POST','character_revive'],['/api/kings/active-campaigns/character/fixture','DELETE','slots_clear_character'],['/api/kings/active-campaigns/campaign/fixture','DELETE','slots_clear_campaign'],['/api/kings/invite-codes/abc123','DELETE','invite_delete'],['/api/kings/invite-codes','POST','invites_create']])assert.equal((await (await command(path,method)).json()).data.action,action);
  await command('/api/kings/invite-codes?environment=staging','POST',{count:2});
  await command('/api/kings/invite-codes','POST',{count:51},400);
  await command('/api/kings/invite-codes','POST',{actor:'forged'},400);
  await command('/api/kings/users/fixture','DELETE',{actor:'forged'},400);
  await command('/api/kings/users/fixture','DELETE',{},403,{Origin:'https://evil.test'});
  await command('/api/kings/users/fixture','DELETE',{},400,{'Idempotency-Key':'invalid'});
  await command('/api/kings/users/fixture','DELETE',{},415,{'Content-Type':'text/plain'});
  await command('/api/kings/users/fixture','DELETE',{padding:'x'.repeat(3000)},413);
  await command('/api/kings/users','DELETE',{},405);
  await request('/api/kings/audit');
  await request('/api/infrastructure');await request('/api/infrastructure?account=other',400);
  await request('/api/games/darts-vs-squirts/audit?environment=staging');
  assert.equal((await (await command('/api/games/darts-vs-squirts/admission?environment=staging','POST',{action:'admission_pause'})).json()).paused,true);
  await command('/api/games/darts-vs-squirts/admission','POST',{action:'raise_capacity'},400);
  await command('/api/games/darts-vs-squirts/admission','POST',{action:'admission_pause',actor:'forged'},400);
  const failure=await (await request('/api/kings/users?search=failure',503)).text();assert.doesNotMatch(failure,/private upstream token/);
  assert.equal((await (await request('/api/games/darts-vs-squirts/monitoring?environment=staging&hours=1')).json()).environment,'staging');
  const denied=await mf.dispatchFetch('https://console.test/api/kings/users');assert.equal(denied.status,401);
  const page=await request('/games/kings-search/users/fixture-record');assert.match(await page.text(),/King’s Search/);
});
