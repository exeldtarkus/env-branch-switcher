import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { snapshotPath, switchEnv } from '../envSwitcher';

function setup(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-switch-'));
  fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
  fs.writeFileSync(path.join(root, '.env'), 'APP=main\n');
  return root;
}

const readEnv = (root: string) => fs.readFileSync(path.join(root, '.env'), 'utf8');

test('branch tanpa snapshot: .env tidak diubah, snapshot branch lama dibuat', () => {
  const root = setup();
  const result = switchEnv(root, '.env', 'main', 'feature/x');
  assert.deepStrictEqual(result, { kind: 'missing', branch: 'feature/x' });
  assert.strictEqual(readEnv(root), 'APP=main\n');
  assert.strictEqual(fs.readFileSync(snapshotPath(root, 'main'), 'utf8'), 'APP=main\n');
});

test('bolak-balik branch memulihkan .env masing-masing', () => {
  const root = setup();
  switchEnv(root, '.env', 'main', 'feature/x');
  fs.writeFileSync(path.join(root, '.env'), 'APP=feature\n');
  assert.strictEqual(switchEnv(root, '.env', 'feature/x', 'main').kind, 'restored');
  assert.strictEqual(readEnv(root), 'APP=main\n');
  switchEnv(root, '.env', 'main', 'feature/x');
  assert.strictEqual(readEnv(root), 'APP=feature\n');
});

test('folder snapshot ditambahkan ke .git/info/exclude sekali saja', () => {
  const root = setup();
  switchEnv(root, '.env', 'main', 'dev');
  switchEnv(root, '.env', 'dev', 'main');
  const exclude = fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf8');
  assert.strictEqual(exclude, '.env-branches/\n');
});
