import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkDeployment } from './check-deploy.mjs';

const deployment = await checkDeployment();
const cwd = fileURLToPath(new URL('../', import.meta.url));
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
function run(args, input) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd, env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: deployment.accountId },
    input, encoding: 'utf8', stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit'
  });
  if (result.error || result.status !== 0) throw new Error('Console deployment did not finish. Keep Access protection active; verify the Worker state before retrying.');
}
// The initial version fails closed until the private owner settings are installed.
run(['deploy', '--env=']);
run(['secret', 'bulk', '--env='], JSON.stringify({
  ACCESS_TEAM_DOMAIN: deployment.accessTeamDomain,
  ACCESS_AUD: deployment.accessAud,
  OWNER_EMAIL: deployment.ownerEmail
}));
console.log('Console published with private owner settings. Complete live owner/anonymous acceptance checks before handoff.');
