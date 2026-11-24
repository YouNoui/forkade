const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
test('service worker only precaches existing same-origin files', () => {
  const root = path.resolve(__dirname, '../web');
  const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const declaration = source.match(/const ASSETS = (\[[\s\S]*?\]);/);
  assert.ok(declaration, 'precache list exists');
  const assets = vm.runInNewContext(declaration[1]);
  for (const asset of assets) {
    assert.ok(asset.startsWith('./'), asset + ' stays same-origin');
    const file = path.resolve(root, asset === './' ? 'index.html' : asset);
    assert.ok(file.startsWith(root + path.sep), asset + ' stays inside web');
    assert.ok(fs.statSync(file).isFile(), asset + ' exists');
  }
  assert.equal(new Set(assets).size, assets.length, 'no duplicate precache entries');
});
