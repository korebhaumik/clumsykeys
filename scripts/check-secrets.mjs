import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Buffer } from 'node:buffer';

// Report locations and categories only. Never include matched text in output.
const patterns = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}/g],
  ['Supabase management token', /\bsbp_[A-Za-z0-9]{20,}/g],
  ['GitHub credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['AWS access key ID', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['OpenAI credential', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}/g],
  ['Stripe credential', /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ['Slack credential', /\bxox[baprs]-[A-Za-z0-9-]{20,}/g],
  ['Google API credential', /\bAIza[A-Za-z0-9_-]{30,}/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Database credential URL', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s/:]+:[^\s/@]+@/g],
];
let findings = 0;
function report(location, line, category) { findings++; console.error(`${JSON.stringify(location)}:${line}: ${category}`); }
function scan(value, location) {
  const content = value.toString('utf8');
  for (const [category, pattern] of patterns) for (const match of content.matchAll(pattern)) {
    report(location, content.slice(0, match.index).split('\n').length, category);
  }
  for (const match of content.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try {
      const claims = JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url').toString());
      if (claims.role === 'service_role') report(location, content.slice(0, match.index).split('\n').length, 'Privileged Supabase JWT');
      else if (claims.role !== 'anon' && (claims.sub || claims.exp)) report(location, content.slice(0, match.index).split('\n').length, 'Potential session JWT');
    } catch { /* A non-JWT string is not evidence of a credential. */ }
  }
}
const git = (...args) => execFileSync('git', args, { maxBuffer: 50_000_000 });
const files = git('ls-files', '--cached', '--others', '--exclude-standard', '-z').toString().split('\0').filter(Boolean);
for (const file of files) {
  if (/(^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith('/.env.example') && file !== '.env.example') report(file, 1, 'Environment file must not be committed');
  if (existsSync(file)) scan(readFileSync(file), file);
}
if (process.argv.includes('--history')) {
  const objects = git('rev-list', '--objects', '--all', '--reflog').toString().trim().split('\n');
  for (const object of objects) {
    const [id, ...path] = object.split(' ');
    const type = git('cat-file', '-t', id).toString().trim();
    if (['blob', 'commit', 'tag'].includes(type)) scan(git('cat-file', type, id), `git:${id.slice(0, 12)}:${path.join(' ')}`);
  }
}
function artifacts(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) artifacts(path); else if (entry.isFile()) scan(readFileSync(path), path);
  }
}
if (process.argv.includes('--artifacts')) { artifacts('dist'); artifacts('backend/build'); }
if (findings) process.exitCode = 1;
else console.log('Secret scan passed for working files' + (process.argv.includes('--history') ? ', reachable history and reflogs' : '') + (process.argv.includes('--artifacts') ? ', and build artifacts.' : '.'));
