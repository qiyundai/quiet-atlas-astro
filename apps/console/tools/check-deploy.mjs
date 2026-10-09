import { readFile } from 'node:fs/promises';
export async function checkDeployment() {
  // Both files intentionally contain strict JSON; parser errors fail closed.
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  let deployment;
  try { deployment = JSON.parse(await readFile(new URL('../deployment.local.json', import.meta.url), 'utf8')); }
  catch { throw new Error('Production deploy blocked: private deployment.local.json is missing or invalid. Review/create owner Access protection first.'); }
  if (!/^[a-f0-9]{32}$/.test(deployment.accountId ?? '') || !/^[a-f0-9]{64}$/.test(deployment.accessAud ?? '') ||
      !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(deployment.accessTeamDomain ?? '') ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deployment.ownerEmail ?? '') || deployment.accessAppVerified !== true) {
    throw new Error('Production deploy blocked: verify the saved owner Access app and fill the private account, team, audience and owner settings.');
  }
  if (config.vars?.ENVIRONMENT !== 'production' || config.assets?.run_worker_first !== true || config.workers_dev !== false || config.preview_urls !== false ||
      !['ACCESS_TEAM_DOMAIN', 'ACCESS_AUD', 'OWNER_EMAIL'].every(name => config.secrets?.required?.includes(name))) {
    throw new Error('Production deploy blocked: owner settings must stay private, all assets must pass through the Worker, and direct preview origins must stay disabled.');
  }
  return deployment;
}
if (process.argv[1]?.endsWith('check-deploy.mjs')) {
  await checkDeployment();
  console.log('Production configuration preflight passed.');
}
