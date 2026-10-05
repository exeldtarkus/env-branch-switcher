import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findEnvFiles, snapshotDir, switchEnv } from '../envSwitcher';

function setup(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-switch-'));
  fs.mkdirSync(path.join(root, '.git', 'info'), { recursive: true });
  fs.writeFileSync(path.join(root, '.env'), 'APP=main\n');
  return root;
}

function write(root: string, rel: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
}

const read = (root: string, rel = '.env') => fs.readFileSync(path.join(root, rel), 'utf8');
const envs = (root: string) => findEnvFiles(root, '.env');

test('branch tanpa snapshot: .env tidak diubah, snapshot branch lama dibuat', () => {
  const root = setup();
  const result = switchEnv(root, envs(root), 'main', 'feature/x');
  assert.deepStrictEqual(result, { kind: 'missing', branch: 'feature/x' });
  assert.strictEqual(read(root), 'APP=main\n');
  assert.strictEqual(read(snapshotDir(root, 'main')), 'APP=main\n');
});

test('bolak-balik branch memulihkan .env masing-masing', () => {
  const root = setup();
  switchEnv(root, envs(root), 'main', 'feature/x');
  fs.writeFileSync(path.join(root, '.env'), 'APP=feature\n');
  assert.strictEqual(switchEnv(root, envs(root), 'feature/x', 'main').kind, 'restored');
  assert.strictEqual(read(root), 'APP=main\n');
  switchEnv(root, envs(root), 'main', 'feature/x');
  assert.strictEqual(read(root), 'APP=feature\n');
});

test('folder snapshot ditambahkan ke .git/info/exclude sekali saja', () => {
  const root = setup();
  switchEnv(root, envs(root), 'main', 'dev');
  switchEnv(root, envs(root), 'dev', 'main');
  const exclude = fs.readFileSync(path.join(root, '.git', 'info', 'exclude'), 'utf8');
  assert.strictEqual(exclude, '.env-branches/\n');
});

test('findEnvFiles menemukan .env di subfolder dan melewati folder build', () => {
  const root = setup();
  write(root, 'src/main/resources/.env', 'DB=main\n');
  write(root, 'target/classes/.env', 'DB=stale\n');
  write(root, 'node_modules/pkg/.env', 'X=1\n');
  write(root, 'src/main/resources/.env.example', 'DB=\n');
  assert.deepStrictEqual(envs(root), ['.env', 'src/main/resources/.env']);
});

test('findEnvFiles menerima path relatif yang spesifik', () => {
  const root = setup();
  write(root, 'backend/.env', 'A=1\n');
  write(root, 'frontend/.env', 'B=1\n');
  assert.deepStrictEqual(findEnvFiles(root, 'backend/.env'), ['backend/.env']);
});

test('semua .env di subfolder ikut disimpan dan dipulihkan per branch', () => {
  const root = setup();
  const nested = 'src/main/resources/.env';
  write(root, nested, 'DB=main\n');
  switchEnv(root, envs(root), 'main', 'dev');
  write(root, nested, 'DB=dev\n');
  fs.writeFileSync(path.join(root, '.env'), 'APP=dev\n');

  const result = switchEnv(root, envs(root), 'dev', 'main');
  assert.deepStrictEqual(result, { kind: 'restored', branch: 'main', count: 2 });
  assert.strictEqual(read(root, nested), 'DB=main\n');
  assert.strictEqual(read(root), 'APP=main\n');

  switchEnv(root, envs(root), 'main', 'dev');
  assert.strictEqual(read(root, nested), 'DB=dev\n');
  assert.strictEqual(read(root), 'APP=dev\n');
});
