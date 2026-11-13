import { loadEnvFile } from 'node:process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(new URL('../.env', import.meta.url))) loadEnvFile(new URL('../.env', import.meta.url));
const ref = process.env.SUPABASE_PROJECT_REF || new URL(process.env.SUPABASE_URL || 'http://localhost').hostname.match(/^([a-z0-9]+)\.supabase\.co$/)?.[1];
if (!ref || !/^[a-z0-9]+$/.test(ref)) throw new Error('Set SUPABASE_PROJECT_REF for the hosted database.');
const mode = process.argv[2];
if (!['--dry-run', '--apply', '--types'].includes(mode)) throw new Error('Choose --dry-run, --apply, or --types.');
const args = mode === '--types' ? ['gen', 'types', 'typescript', '--schema', 'public', `--remote=${ref}`]
  : ['db', 'push', `--remote=${ref}`, '--skip-vault', ...(mode === '--dry-run' ? ['--dry-run'] : ['--yes'])];
const result = spawnSync(fileURLToPath(new URL('../node_modules/.bin/supabase', import.meta.url)), args,
  { cwd: root, env: process.env, encoding: 'utf8', timeout: 120_000, maxBuffer: 10_000_000 });
function redact(value = '') {
  for (const name of ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_SECRET_KEY']) {
    if (process.env[name]) value = value.replaceAll(process.env[name], '[redacted]');
  }
  return value;
}
if (mode === '--types' && result.status === 0 && result.stdout.includes('export type Database')) {
  const source = ts.createSourceFile('database.types.ts', result.stdout, ts.ScriptTarget.Latest, true);
  writeFileSync(new URL('../backend/src/database.types.ts', import.meta.url),
    '// Generated from the Supabase schema. Regenerate with npm run db:types.\n' + ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(source));
  console.log('Updated backend/src/database.types.ts from the hosted schema.');
} else if (result.stdout) process.stdout.write(redact(result.stdout));
if (result.stderr) process.stderr.write(redact(result.stderr));
if (result.error) console.error('Supabase CLI could not complete:', result.error.code ?? result.error.name);
process.exitCode = result.status ?? 1;
