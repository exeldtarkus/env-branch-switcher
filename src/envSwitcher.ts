import * as fs from 'fs';
import * as path from 'path';

export const SNAPSHOT_DIR = '.env-branches';

export type SwitchResult =
  | { kind: 'restored'; branch: string }
  | { kind: 'missing'; branch: string };

export function snapshotPath(repoRoot: string, branch: string): string {
  return path.join(repoRoot, SNAPSHOT_DIR, `${encodeURIComponent(branch)}.env`);
}

/** Simpan isi env file saat ini sebagai snapshot milik `branch`. Return false jika env file tidak ada. */
export function saveSnapshot(repoRoot: string, envFile: string, branch: string): boolean {
  const envPath = path.join(repoRoot, envFile);
  if (!fs.existsSync(envPath)) {
    return false;
  }
  fs.mkdirSync(path.join(repoRoot, SNAPSHOT_DIR), { recursive: true });
  ensureExcluded(repoRoot);
  fs.copyFileSync(envPath, snapshotPath(repoRoot, branch));
  return true;
}

/** Simpan env milik `from`, lalu pulihkan snapshot `to` jika ada. Env file tidak diubah jika snapshot `to` belum ada. */
export function switchEnv(repoRoot: string, envFile: string, from: string | undefined, to: string): SwitchResult {
  if (from) {
    saveSnapshot(repoRoot, envFile, from);
  }
  const target = snapshotPath(repoRoot, to);
  if (!fs.existsSync(target)) {
    return { kind: 'missing', branch: to };
  }
  fs.copyFileSync(target, path.join(repoRoot, envFile));
  return { kind: 'restored', branch: to };
}

/** Tambahkan folder snapshot ke .git/info/exclude agar tidak ikut ter-commit. */
function ensureExcluded(repoRoot: string): void {
  const gitDir = path.join(repoRoot, '.git');
  if (!fs.existsSync(gitDir) || !fs.statSync(gitDir).isDirectory()) {
    return; // worktree / submodule: .git berupa file, lewati
  }
  const excludePath = path.join(gitDir, 'info', 'exclude');
  const entry = `${SNAPSHOT_DIR}/`;
  const current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
  if (current.split(/\r?\n/).includes(entry)) {
    return;
  }
  fs.mkdirSync(path.dirname(excludePath), { recursive: true });
  const prefix = current.length > 0 && !current.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(excludePath, `${prefix}${entry}\n`);
}
