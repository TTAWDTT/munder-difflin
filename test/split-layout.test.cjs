'use strict';

/** #311: the divider must remain vertical by default, but support a horizontal
 *  split where the landscape floor sits above a full-width terminal. Both
 *  orientations remember their own pane size. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { parseSplitOrientation, clampPaneSize } = loadTs('src/renderer/src/splitLayout.ts');
const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

test('persisted orientation is defensive and defaults to the existing vertical split', () => {
  assert.equal(parseSplitOrientation(undefined), 'vertical');
  assert.equal(parseSplitOrientation(null), 'vertical');
  assert.equal(parseSplitOrientation('sideways'), 'vertical');
  assert.equal(parseSplitOrientation('horizontal'), 'horizontal');
});

test('vertical pane sizes preserve the current sidebar limits', () => {
  assert.equal(clampPaneSize(200, 5000, 'vertical'), 320);
  assert.equal(clampPaneSize(420, 5000, 'vertical'), 420);
  assert.equal(clampPaneSize(1400, 5000, 'vertical'), 1200);
});

test('horizontal pane sizing reserves a usable terminal below the floor', () => {
  assert.equal(clampPaneSize(100, 1200, 'horizontal'), 180);
  assert.equal(clampPaneSize(510, 1200, 'horizontal'), 510);
  assert.equal(clampPaneSize(900, 1200, 'horizontal'), 800);
  assert.equal(clampPaneSize(400, 350, 'horizontal'), 180, 'very short windows still leave room for the terminal');
});

test('the store persists orientation and floor height separately from width', () => {
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /splitOrientation: SplitOrientation/);
  assert.match(store, /sidebarHeight: number/);
  assert.match(store, /LS_SPLIT_ORIENTATION = 'cth\.splitOrientation'/);
  assert.match(store, /LS_SIDEBAR_HEIGHT = 'cth\.sidebarHeight'/);
  assert.match(store, /setSplitOrientation: \(orientation: SplitOrientation\) => void/);
  assert.match(store, /setSidebarHeight: \(px: number\) => void;/);
});

test('the titlebar toggles both divider directions and the layout follows it', () => {
  const app = read('src/renderer/src/App.tsx');
  const splitter = read('src/renderer/src/components/SidebarSplitter.tsx');
  assert.match(app, /setSplitOrientation\(splitOrientation === 'vertical' \? 'horizontal' : 'vertical'\)/);
  assert.match(app, /flexDirection: splitOrientation === 'horizontal' \? 'column' : 'row'/);
  assert.match(app, /aria-label=\{splitOrientation === 'vertical' \? 'Switch to horizontal split' : 'Switch to vertical split'\}/);
  assert.match(splitter, /orientation = 'vertical'/);
  assert.match(splitter, /ns-resize/);
});
