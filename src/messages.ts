export type Lang = 'en' | 'id';

/** Akhiran jumlah file, hanya ditampilkan jika lebih dari satu. */
const files = (count: number) => (count > 1 ? ` (${count})` : '');

const en = {
  noActiveBranch: () => 'No active branch.',
  saved: (file: string, count: number, branch: string) => `${file} saved for branch '${branch}'${files(count)}.`,
  envNotFound: (file: string) => `${file} not found.`,
  restored: (file: string, count: number, branch: string) =>
    `$(check) ${file} restored for branch '${branch}'${files(count)}`,
  missing: (file: string, branch: string) =>
    `Branch '${branch}' has no saved ${file}. The current ${file} was left unchanged.`,
  failed: (error: string) => `Env Branch Switcher failed: ${error}`,
};

const id: typeof en = {
  noActiveBranch: () => 'Tidak ada branch aktif.',
  saved: (file, count, branch) => `${file} disimpan untuk branch '${branch}'${files(count)}.`,
  envNotFound: (file) => `${file} tidak ditemukan.`,
  restored: (file, count, branch) => `$(check) ${file} dipulihkan untuk branch '${branch}'${files(count)}`,
  missing: (file, branch) => `Branch '${branch}' belum memiliki ${file} tersimpan. ${file} saat ini tidak diubah.`,
  failed: (error) => `Env Branch Switcher gagal: ${error}`,
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
