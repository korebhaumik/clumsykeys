import { readFileSync, readdirSync } from 'node:fs';
const errors = [];
for (const file of readdirSync('src', { recursive: true }).filter(file => /\.(css|svelte|ts)$/.test(file))) {
  const source = readFileSync(`src/${file}`, 'utf8');
  if (file !== 'styles/tokens.css' && /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(source)) errors.push(`${file}: raw color outside tokens`);
  if (file.includes('/icons/') && /onclick=/.test(source)) errors.push(`${file}: icons must be presentational`);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Design audit passed: centralized colors and presentational icons.');
