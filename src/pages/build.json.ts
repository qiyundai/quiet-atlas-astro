import type { APIRoute } from 'astro';

export const prerender = true;
/** Only public source identity crosses this endpoint; never serialize the environment. */
export const GET: APIRoute = () => {
  const candidate = process.env.CF_PAGES_COMMIT_SHA ?? '';
  return new Response(JSON.stringify({schemaVersion:1,
    commit:/^[a-f0-9]{40}$/.test(candidate)?candidate:null,
    builtAt:new Date().toISOString()}),{headers:{'Content-Type':'application/json','Cache-Control':'no-cache'}});
};
