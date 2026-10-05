import { test } from 'node:test';
import * as assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  MAX_BACKUPS,
  SNAPSHOT_DIR,
  backupDir,
  findEnvFiles,
  resetSnapshots,
  saveSnapshot,
  snapshotDir,
  switchEnv,
} from '../envSwitcher';

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
  assert.deepStrictEqual(result, {
    kind: 'restored',
    branch: 'main',
    count: 2,
    files: ['.env', 'src/main/resources/.env'],
  });
  assert.strictEqual(read(root, nested), 'DB=main\n');
  assert.strictEqual(read(root), 'APP=main\n');

  switchEnv(root, envs(root), 'main', 'dev');
  assert.strictEqual(read(root, nested), 'DB=dev\n');
  assert.strictEqual(read(root), 'APP=dev\n');
});

test('snapshot lama yang berbeda di-backup sebelum ditimpa', () => {
  const root = setup();
  saveSnapshot(root, envs(root), 'dev');
  fs.writeFileSync(path.join(root, '.env'), 'APP=other\n');
  saveSnapshot(root, envs(root), 'dev');
  assert.strictEqual(read(snapshotDir(root, 'dev')), 'APP=other\n');
  const backups = fs.readdirSync(backupDir(root, 'dev'));
  assert.strictEqual(backups.length, 1);
  assert.strictEqual(read(path.join(backupDir(root, 'dev'), backups[0])), 'APP=main\n');
});

test('tidak ada backup jika isi snapshot sama', () => {
  const root = setup();
  saveSnapshot(root, envs(root), 'dev');
  saveSnapshot(root, envs(root), 'dev');
  assert.strictEqual(fs.existsSync(backupDir(root, 'dev')), false);
});

test(`backup dibatasi ${MAX_BACKUPS} terbaru per branch`, () => {
  const root = setup();
  for (let i = 0; i <= MAX_BACKUPS + 2; i++) {
    fs.writeFileSync(path.join(root, '.env'), `APP=${i}\n`);
    saveSnapshot(root, envs(root), 'dev');
  }
  const backups = fs.readdirSync(backupDir(root, 'dev')).sort();
  assert.strictEqual(backups.length, MAX_BACKUPS);
  assert.strictEqual(read(path.join(backupDir(root, 'dev'), backups[MAX_BACKUPS - 1])), `APP=${MAX_BACKUPS + 1}\n`);
});

test('folder backup tidak dianggap sebagai env file atau snapshot branch', () => {
  const root = setup();
  saveSnapshot(root, envs(root), 'main');
  fs.writeFileSync(path.join(root, '.env'), 'APP=x\n');
  saveSnapshot(root, envs(root), 'main');
  assert.deepStrictEqual(envs(root), ['.env']);
  assert.deepStrictEqual(switchEnv(root, envs(root), 'main', 'main').kind, 'restored');
});

test('resetSnapshots menghapus semua snapshot tanpa mengubah .env', () => {
  const root = setup();
  switchEnv(root, envs(root), 'main', 'dev');
  fs.writeFileSync(path.join(root, '.env'), 'APP=dev\n');
  saveSnapshot(root, envs(root), 'main');
  resetSnapshots(root);
  assert.strictEqual(fs.existsSync(path.join(root, SNAPSHOT_DIR)), false);
  assert.strictEqual(read(root), 'APP=dev\n');
});
