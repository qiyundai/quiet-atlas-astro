import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, unlink, rmdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
// A new Worker requires its secrets in the initial publish. Never put their
// values in CLI arguments or tracked files, and remove the private file on exit.
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'quiet-atlas-deploy-'));
const secretsFile = join(temporaryDirectory, 'secrets.json');
try {
  await writeFile(secretsFile, JSON.stringify({
    ACCESS_TEAM_DOMAIN: deployment.accessTeamDomain,
    ACCESS_AUD: deployment.accessAud,
    OWNER_EMAIL: deployment.ownerEmail
  }), { mode: 0o600 });
  run(['deploy', '--env=', '--secrets-file', secretsFile]);
} finally {
  await unlink(secretsFile).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await rmdir(temporaryDirectory);
}
console.log('Console published with private owner settings. Complete live owner/anonymous acceptance checks before handoff.');
