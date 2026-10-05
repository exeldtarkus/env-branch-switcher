import * as fs from 'fs';
import * as path from 'path';

export const SNAPSHOT_DIR = '.env-branches';

export const DEFAULT_EXCLUDE = [
  '.git',
  SNAPSHOT_DIR,
  'node_modules',
  'target',
  'build',
  'bin',
  'out',
  'dist',
  'vendor',
  '.gradle',
  '.idea',
  '.venv',
  'venv',
  '__pycache__',
];

export type SwitchResult =
  | { kind: 'restored'; branch: string; count: number }
  | { kind: 'missing'; branch: string };

export function snapshotDir(repoRoot: string, branch: string): string {
  return path.join(repoRoot, SNAPSHOT_DIR, encodeURIComponent(branch));
}

/**
 * Cari semua env file di dalam repo. Sebuah file cocok jika path relatifnya sama dengan `envFile`
 * (mis. "backend/.env") atau nama filenya sama dengan `envFile` (mis. ".env").
 * Folder yang namanya ada di `exclude` dan symlink dilewati. Return path relatif terhadap repoRoot.
 */
export function findEnvFiles(repoRoot: string, envFile: string, exclude: string[] = DEFAULT_EXCLUDE): string[] {
  const target = envFile.replace(/\\/g, '/').replace(/^\.\//, '');
  const skip = new Set([...exclude, '.git', SNAPSHOT_DIR]);
  const found: string[] = [];
  const walk = (rel: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(repoRoot, rel), { withFileTypes: true });
    } catch {
      return; // folder tidak bisa dibaca: lewati
    }
    for (const entry of entries) {
      const childRel = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!skip.has(entry.name)) {
          walk(childRel);
        }
      } else if (entry.isFile() && (childRel === target || entry.name === target)) {
        found.push(childRel);
      }
    }
  };
  walk('');
  return found.sort();
}

/** Simpan `files` (path relatif) sebagai snapshot milik `branch`, menggantikan snapshot lama. Return jumlah file yang disimpan. */
export function saveSnapshot(repoRoot: string, files: string[], branch: string): number {
  const existing = files.filter((f) => fs.existsSync(path.join(repoRoot, f)));
  if (existing.length === 0) {
    return 0; // jangan hapus snapshot lama jika tidak ada yang bisa disimpan
  }
  const dir = snapshotDir(repoRoot, branch);
  fs.rmSync(dir, { recursive: true, force: true });
  ensureExcluded(repoRoot);
  for (const file of existing) {
    const dest = path.join(dir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), dest);
  }
  return existing.length;
}

/** Simpan env milik `from`, lalu pulihkan snapshot `to` jika ada. Env file tidak diubah jika snapshot `to` belum ada. */
export function switchEnv(repoRoot: string, files: string[], from: string | undefined, to: string): SwitchResult {
  if (from) {
    saveSnapshot(repoRoot, files, from);
  }
  const dir = snapshotDir(repoRoot, to);
  const saved = fs.existsSync(dir) ? listFiles(dir) : [];
  if (saved.length === 0) {
    return { kind: 'missing', branch: to };
  }
  for (const file of saved) {
    const dest = path.join(repoRoot, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(dir, file), dest);
  }
  return { kind: 'restored', branch: to, count: saved.length };
}

/** Semua file di dalam `dir` (rekursif), sebagai path relatif terhadap `dir`. */
function listFiles(dir: string, rel = ''): string[] {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((entry) => {
    const childRel = rel ? path.join(rel, entry.name) : entry.name;
    if (entry.isDirectory()) {
      return listFiles(dir, childRel);
    }
    return entry.isFile() ? [childRel] : [];
  });
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
