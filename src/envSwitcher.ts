import * as fs from 'fs';
import * as path from 'path';

export const SNAPSHOT_DIR = '.env-branches';
/** Nama ref git tidak boleh diawali '.', jadi folder ini tidak bisa bentrok dengan snapshot branch. */
export const BACKUP_DIR = '.backup';
export const MAX_BACKUPS = 5;

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
  | { kind: 'restored'; branch: string; count: number; files: string[] }
  | { kind: 'created'; branch: string; from: string | undefined; count: number; files: string[] }
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
  if (fs.existsSync(dir)) {
    if (sameContent(repoRoot, existing, dir)) {
      return existing.length;
    }
    backupSnapshot(repoRoot, branch);
  }
  ensureExcluded(repoRoot);
  for (const file of existing) {
    const dest = path.join(dir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(repoRoot, file), dest);
  }
  return existing.length;
}

/**
 * Simpan env milik `from`, lalu pulihkan snapshot `to` jika ada. Jika snapshot `to` belum ada, env file tidak diubah
 * dan isinya saat ini langsung disimpan sebagai snapshot `to`.
 */
export function switchEnv(repoRoot: string, files: string[], from: string | undefined, to: string): SwitchResult {
  if (from) {
    saveSnapshot(repoRoot, files, from);
  }
  const dir = snapshotDir(repoRoot, to);
  const saved = fs.existsSync(dir) ? listFiles(dir) : [];
  if (saved.length === 0) {
    const count = saveSnapshot(repoRoot, files, to);
    if (count === 0) {
      return { kind: 'missing', branch: to };
    }
    return { kind: 'created', branch: to, from, count, files: toPosix(listFiles(dir)) };
  }
  for (const file of saved) {
    const dest = path.join(repoRoot, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(dir, file), dest);
  }
  return { kind: 'restored', branch: to, count: saved.length, files: toPosix(saved) };
}

function toPosix(files: string[]): string[] {
  return files.map((f) => f.split(path.sep).join('/')).sort();
}

export function backupDir(repoRoot: string, branch: string): string {
  return path.join(repoRoot, SNAPSHOT_DIR, BACKUP_DIR, encodeURIComponent(branch));
}

/** True jika isi snapshot di `dir` sama persis dengan `files` di working tree. */
function sameContent(repoRoot: string, files: string[], dir: string): boolean {
  const saved = toPosix(listFiles(dir));
  if (saved.length !== files.length || !files.every((f) => saved.includes(f))) {
    return false;
  }
  return files.every((f) => fs.readFileSync(path.join(repoRoot, f)).equals(fs.readFileSync(path.join(dir, f))));
}

/** Pindahkan snapshot lama `branch` ke folder backup bertimestamp, simpan maksimal MAX_BACKUPS terbaru. */
function backupSnapshot(repoRoot: string, branch: string): void {
  const root = backupDir(repoRoot, branch);
  fs.mkdirSync(root, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  let target = path.join(root, stamp);
  for (let n = 1; fs.existsSync(target); n++) {
    target = path.join(root, `${stamp}-${n}`);
  }
  fs.renameSync(snapshotDir(repoRoot, branch), target);
  const old = fs.readdirSync(root).sort().slice(0, -MAX_BACKUPS);
  for (const name of old) {
    fs.rmSync(path.join(root, name), { recursive: true, force: true });
  }
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

/** Hapus semua snapshot (termasuk backup) di repo. Env file di working tree tidak diubah. */
export function resetSnapshots(repoRoot: string): void {
  fs.rmSync(path.join(repoRoot, SNAPSHOT_DIR), { recursive: true, force: true });
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
