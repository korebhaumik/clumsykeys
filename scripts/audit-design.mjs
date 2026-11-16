import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'svelte/compiler';
const errors = [];
const controls = new Set(['a', 'button', 'input', 'select', 'textarea']);
function checkTabStops(node, file) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'RegularElement' && controls.has(node.name) &&
    !node.attributes.some(attribute => attribute.type === 'Attribute' && attribute.name === 'tabindex')) {
    errors.push(`${file}: ${node.name} needs an explicit tabindex for Safari keyboard navigation`);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => checkTabStops(child, file));
    else if (value && typeof value === 'object') checkTabStops(value, file);
  }
}
for (const file of readdirSync('src', { recursive: true }).filter(file => /\.(css|svelte|ts)$/.test(file))) {
  const source = readFileSync(`src/${file}`, 'utf8');
  if (file !== 'styles/tokens.css' && /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(source)) errors.push(`${file}: raw color outside tokens`);
  if (file.includes('/icons/') && /onclick=/.test(source)) errors.push(`${file}: icons must be presentational`);
  if (file.endsWith('.svelte')) checkTabStops(parse(source, { modern: true }).fragment, file);
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('Design audit passed: centralized colors, presentational icons and explicit keyboard tab stops.');
