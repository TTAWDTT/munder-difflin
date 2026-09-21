'use strict';

/**
 * #445: renaming a project folder used to make an agent permanently unusable.
 * The repair must update the durable hive registry (and its fleet snapshot),
 * reject folders that would just fail the next spawn, and leave UI affordances
 * on the same surface that reports the invalid cwd.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function tmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md-cwd-repair-'));
}

function registryOf(home) {
  return JSON.parse(fs.readFileSync(path.join(home, 'hive', 'registry.json'), 'utf8'));
}

function fleetOf(home) {
  return JSON.parse(fs.readFileSync(path.join(home, 'hive', 'fleet.json'), 'utf8'));
}

test('setAgentCwd repairs registry and fleet without changing agent identity', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const oldCwd = path.join(home, 'old-project');
  const newCwd = path.join(home, 'renamed-project');
  fs.mkdirSync(oldCwd, { recursive: true });

  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: oldCwd });

  // Emulate the user renaming the folder while the app is closed. The failed
  // launch records the broken state into the durable registry entry.
  fs.renameSync(oldCwd, newCwd);
  const broken = registryOf(home);
  broken.agents.a1.cwdValid = false;
  fs.writeFileSync(path.join(home, 'hive', 'registry.json'), JSON.stringify(broken), 'utf8');
  assert.equal(registryOf(home).agents.a1.cwdValid, false, 'setup: the old path must be invalid');

  fs.writeFileSync(
    path.join(home, 'hive', 'fleet.json'),
    JSON.stringify({ agents: [{ id: 'a1', cwd: oldCwd, cwdValid: false }] }),
    'utf8'
  );

  const result = await Promise.resolve(hive.setAgentCwd('a1', newCwd));
  assert.deepEqual(result, { ok: true, cwd: newCwd });

  const agent = registryOf(home).agents.a1;
  assert.equal(agent.cwd, newCwd);
  assert.equal(agent.cwdValid, true);

  const fleet = fleetOf(home);
  assert.equal(fleet.agents[0].cwd, newCwd);
  assert.equal(fleet.agents[0].cwdValid, true);
});

test('setAgentCwd refuses paths that would fail the next spawn', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const cwd = path.join(home, 'project');
  fs.mkdirSync(cwd, { recursive: true });

  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd });

  const before = registryOf(home).agents.a1;
  assert.equal(hive.setAgentCwd('a1', 'relative/path').ok, false);
  assert.equal(hive.setAgentCwd('a1', path.join(home, 'missing')).ok, false);
  assert.equal(hive.setAgentCwd('missing-agent', cwd).ok, false);

  const after = registryOf(home).agents.a1;
  assert.equal(after.cwd, cwd, 'a rejected repair must not mutate the registry');
  assert.equal(after.cwdValid, before.cwdValid);
});

test('the repair path is exposed through IPC and the detail UI', () => {
  const main = read('src/main/index.ts');
  const preload = read('src/preload/index.ts');
  const detail = read('src/renderer/src/components/AgentDetailPanel.tsx');
  const card = read('src/renderer/src/components/AgentCard.tsx');

  assert.match(main, /ipcMain.handle\('hive:setAgentCwd'/);
  assert.match(preload, /hiveSetAgentCwd/);
  assert.match(detail, /agent\.cwdValid === false/);
  assert.match(detail, /changeFolder/);
  assert.match(card, /cwdValid === false/);
});

test('all locales expose the repair state and action', () => {
  for (const code of ['en', 'zh-CN', 'ar']) {
    const strings = JSON.parse(read(`src/renderer/src/i18n/locales/${code}.json`));
    assert.equal(typeof strings.agentCard.folderMissing, 'string');
    assert.equal(typeof strings.agentDetail.cwdNeedsAttention, 'string');
    assert.equal(typeof strings.agentDetail.changeFolder, 'string');
  }
});
