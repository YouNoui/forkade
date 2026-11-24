// Keep screenshots, videos and reports outside the checkout.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.resolve(process.env.FORKADE_ARTIFACTS || path.join(os.homedir(), 'Desktop', 'shared process', 'echo-rumble', 'archive', 'test-output'));
module.exports = function artifact(name = '') {
  const target = path.resolve(root, name);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Artifact path escapes output folder');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  return target + (name.endsWith('/') ? path.sep : '');
};
