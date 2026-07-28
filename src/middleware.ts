import type { MiddlewareHandler } from 'astro';
import TurndownService from 'turndown';

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const accept = ctx.request.headers.get('accept') ?? '';
  if (!accept.includes('text/markdown')) return next();

  const res = await next();
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) return res;

  const html = await res.text();
  const md = td.turndown(html);
  return new Response(md, {
    status: res.status,
    headers: { 'content-type': 'text/markdown; charset=utf-8', vary: 'accept' },
  });
};
