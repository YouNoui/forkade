// All local browser assertions, once each. Helpers and recording tools are not tests.
const { spawn } = require('node:child_process');
const serve = require('./server.cjs');
const scripts = [
  'style', 'security', 'growth', 'promo-browser', 'assist', 'bonus', 'experiment', 'fair', 'ux',
  'update-browser', 'social-browser', 'game-upgrades', 'prism-upgrade',
  'drift-upgrade', 'trail-upgrade', 'glass-upgrade', 'wrecker-upgrade',
  'demo-upgrade', 'match-upgrade', 'rampage-upgrade', 'rampage-browser',
  'echo3d-upgrade', 'echo3d-browser', 'rumble-sharing-browser',
  'rumble-browser', 'rumble-v2-browser', 'offline'
];
function run(name, extra = {}) {
  return new Promise((resolve, reject) => {
    console.log('Checking ' + name + (extra.WEBKIT ? ' (WebKit)' : ''));
    const child = spawn(process.execPath, [...process.execArgv, 'tests/' + name + '.cjs'], {
      stdio: 'inherit', env: { ...process.env, ...extra }
    });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(name + ' exited ' + code)));
  });
}
(async () => {
  await run('browser', { WEBKIT: '' });
  await run('browser', { WEBKIT: '1' });
  for (const name of scripts) await run(name, { RUMBLE_CI: process.env.CI ? '1' : '', SECURITY_BROWSER: name==='security'?'1':'' });
  await run('game-live');
  const fixture = serve();
  await new Promise(resolve => fixture.app.listen(0, '127.0.0.1', resolve));
  try {
    await run('release', { CHECK_URL: 'http://127.0.0.1:' + fixture.app.address().port });
  } finally {
    fixture.app.close();
    fixture.restore();
  }
  if (process.env.FORKADE_PREVIEW_URL) await run('preview');
  else console.log('Hosted preview writes not requested: preview.cjs is an explicit isolated-preview integration test.');
})().catch(error => { console.error(error); process.exitCode = 1; });
