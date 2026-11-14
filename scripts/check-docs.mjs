import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';

const read = file => readFileSync(file, 'utf8');
const spec = JSON.parse(read('docs/api.openapi.json'));
const maintained = ['CONTRAST.md', 'DEPLOYMENT.md', 'SECURITY_AUDIT.md', 'SUPABASE.md', 'api.openapi.json'];
assert.deepEqual(readdirSync('docs').filter(name => !name.startsWith('.')).sort(), maintained.sort(), 'Review the maintained documentation inventory');
assert.equal(spec.openapi, '3.1.0');

const methods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const registered = new Set();
const incoming = new Set();
const outgoing = new Set();
for (const file of readdirSync('backend/src').filter(name => name.endsWith('.ts'))) {
  const source = ts.createSourceFile(file, read(`backend/src/${file}`), ts.ScriptTarget.Latest, true);
  const visit = node => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const member = node.expression;
      const method = member.name.text;
      const owner = member.expression.getText(source);
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) {
        if (owner === 'app' && methods.has(method)) {
          registered.add(`${method.toUpperCase()} ${argument.text.replace(/:([A-Za-z0-9_]+)/g, '{$1}')}`);
        }
        if (owner === 'socket' && method === 'on') incoming.add(argument.text);
        if (method === 'emit') outgoing.add(argument.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const documented = new Set();
const operationIds = new Set();
for (const [path, item] of Object.entries(spec.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!methods.has(method)) continue;
    documented.add(`${method.toUpperCase()} ${path}`);
    assert.ok(operation.operationId && !operationIds.has(operation.operationId), `Missing/duplicate operationId at ${path}`);
    operationIds.add(operation.operationId);
    assert.ok(operation.summary && operation.description && Object.keys(operation.responses).length, `Incomplete operation at ${path}`);
  }
}
assert.deepEqual([...registered].sort(), [...documented].sort(), 'HTTP operations must match backend route registrations');
const socket = spec['x-socketio'];
incoming.delete('disconnect');
assert.deepEqual([...incoming].sort(), Object.keys(socket.clientToServer).sort(), 'Client Socket.IO events must match the spec');
assert.deepEqual([...outgoing].sort(), Object.keys(socket.serverToClient).sort(), 'Server Socket.IO events must match the spec');
assert.ok(socket.transportEvents.disconnect && socket.transportEvents.connect_error);

const checkReferences = value => {
  if (!value || typeof value !== 'object') return;
  if (typeof value.$ref === 'string') {
    assert.ok(value.$ref.startsWith('#/'), 'The application spec must be self-contained');
    const target = value.$ref.slice(2).split('/').reduce((object, key) => object?.[key.replaceAll('~1', '/').replaceAll('~0', '~')], spec);
    assert.notEqual(target, undefined, `Unresolved reference: ${value.$ref}`);
  }
  Object.values(value).forEach(checkReferences);
};
checkReferences(spec);

for (const file of ['README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'ARCHITECTURE.md', 'DESIGN.md', ...maintained.filter(name => name.endsWith('.md')).map(name => `docs/${name}`)]) {
  for (const match of read(file).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].replace(/^<|>$/g, '').split(/[?#]/)[0];
    if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    assert.ok(existsSync(resolve(dirname(file), decodeURIComponent(target))), `Broken local link in ${file}: ${target}`);
  }
}
console.log(`Documentation passed: ${documented.size} HTTP operations, ${incoming.size} client and ${outgoing.size} server Socket.IO events, internal references and local links.`);
