export type Lang = 'en' | 'id';

/** Akhiran jumlah file, hanya ditampilkan jika lebih dari satu. */
const files = (count: number) => (count > 1 ? ` (${count})` : '');

const en = {
  noActiveBranch: () => 'No active branch.',
  saved: (file: string, count: number, branch: string) => `${file} saved for branch '${branch}'${files(count)}.`,
  envNotFound: (file: string) => `${file} not found.`,
  restored: (file: string, count: number, branch: string) =>
    `$(check) ${file} restored for branch '${branch}'${files(count)}`,
  updated: (branch: string, paths: string[]) => `Env updated from the saved snapshot of branch '${branch}': ${paths.join(', ')}`,
  created: (branch: string, from: string | undefined, paths: string[]) =>
    `No snapshot for branch '${branch}' yet — created one from the current env${from ? ` (from '${from}')` : ''}: ${paths.join(', ')}`,
  missing: (file: string, branch: string) =>
    `Branch '${branch}' has no saved ${file}. The current ${file} was left unchanged.`,
  failed: (error: string) => `Env Branch Switcher failed: ${error}`,
  activationPlaceholder: () => 'Automatically swap .env when switching branches in this workspace?',
  current: () => 'current',
  notEnabled: () => "Env Branch Switcher is not active in this workspace. Run 'Env Branch Switcher: Activation' first.",
  enabled: () => 'Env Branch Switcher enabled for this workspace.',
  disabled: () => 'Env Branch Switcher disabled for this workspace.',
};

const id: typeof en = {
  noActiveBranch: () => 'Tidak ada branch aktif.',
  saved: (file, count, branch) => `${file} disimpan untuk branch '${branch}'${files(count)}.`,
  envNotFound: (file) => `${file} tidak ditemukan.`,
  restored: (file, count, branch) => `$(check) ${file} dipulihkan untuk branch '${branch}'${files(count)}`,
  updated: (branch, paths) => `Env diperbarui dari snapshot branch '${branch}': ${paths.join(', ')}`,
  created: (branch, from, paths) =>
    `Branch '${branch}' belum punya snapshot — dibuat dari env saat ini${from ? ` (dari '${from}')` : ''}: ${paths.join(', ')}`,
  missing: (file, branch) => `Branch '${branch}' belum memiliki ${file} tersimpan. ${file} saat ini tidak diubah.`,
  failed: (error) => `Env Branch Switcher gagal: ${error}`,
  activationPlaceholder: () => 'Tukar .env otomatis saat pindah branch di workspace ini?',
  current: () => 'saat ini',
  notEnabled: () => "Env Branch Switcher belum aktif di workspace ini. Jalankan 'Env Branch Switcher: Aktivasi' terlebih dahulu.",
  enabled: () => 'Env Branch Switcher diaktifkan untuk workspace ini.',
  disabled: () => 'Env Branch Switcher dinonaktifkan untuk workspace ini.',
};

export type Messages = typeof en;

/** `setting` = nilai envBranchSwitcher.language; `displayLanguage` = vscode.env.language. */
export function resolveLang(setting: string | undefined, displayLanguage: string): Lang {
  if (setting === 'en' || setting === 'id') {
    return setting;
  }
  return displayLanguage.toLowerCase().startsWith('id') ? 'id' : 'en';
}

export function messages(lang: Lang): Messages {
  return lang === 'id' ? id : en;
}
