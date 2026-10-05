import * as vscode from 'vscode';
import * as path from 'path';
import { GitExtension, Repository } from './git';
import { DEFAULT_EXCLUDE, SNAPSHOT_DIR, findEnvFiles, resetSnapshots, saveSnapshot, switchEnv } from './envSwitcher';
import { Lang, messages, resolveLang } from './messages';

const LAST_BRANCH_KEY = 'envBranchSwitcher.lastBranch:';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const gitExt = vscode.extensions.getExtension<GitExtension>('vscode.git');
  if (!gitExt) {
    return;
  }
  const git = (gitExt.isActive ? gitExt.exports : await gitExt.activate()).getAPI(1);
  const watched = new Set<string>();

  const watch = (repo: Repository) => {
    const root = repo.rootUri.fsPath;
    if (watched.has(root)) {
      return;
    }
    watched.add(root);
    handleChange(context, repo);
    context.subscriptions.push(repo.state.onDidChange(() => handleChange(context, repo)));
  };

  git.repositories.forEach(watch);
  context.subscriptions.push(
    git.onDidOpenRepository(watch),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('envBranchSwitcher.enabled')) {
        git.repositories.forEach((repo) => handleChange(context, repo));
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('envBranchSwitcher.activation', async () => {
      const current = config().get<boolean>('enabled', false);
      const picked = await vscode.window.showQuickPick(
        [true, false].map((value) => ({
          label: String(value),
          description: value === current ? t().current() : undefined,
          value,
        })),
        { placeHolder: t().activationPlaceholder() },
      );
      if (!picked || picked.value === current) {
        return;
      }
      await config().update('enabled', picked.value, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(picked.value ? t().enabled() : t().disabled());
    }),
    vscode.commands.registerCommand('envBranchSwitcher.language', async () => {
      const current = currentLang();
      const options: { label: string; value: Lang }[] = [
        { label: 'English', value: 'en' },
        { label: 'Bahasa Indonesia', value: 'id' },
      ];
      const picked = await vscode.window.showQuickPick(
        options.map((o) => ({ ...o, description: o.value === current ? t().current() : undefined })),
        { placeHolder: t().languagePlaceholder() },
      );
      if (!picked || picked.value === current) {
        return;
      }
      // Bahasa adalah preferensi pribadi, jadi disimpan di user settings (berlaku untuk semua project).
      await config().update('language', picked.value, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(t().languageChanged());
    }),
    vscode.commands.registerCommand('envBranchSwitcher.saveSnapshot', async () => {
      if (!ensureEnabled()) {
        return;
      }
      const repo = await pickRepo(git.repositories);
      const branch = repo?.state.HEAD?.name;
      if (!repo || !branch) {
        vscode.window.showWarningMessage(t().noActiveBranch());
        return;
      }
      const envFile = config().get<string>('envFile', '.env');
      const count = saveSnapshot(repo.rootUri.fsPath, envFiles(repo.rootUri.fsPath), branch);
      if (count > 0) {
        vscode.window.showInformationMessage(t().saved(envFile, count, branch));
      } else {
        vscode.window.showWarningMessage(t().envNotFound(envFile));
      }
    }),
    vscode.commands.registerCommand('envBranchSwitcher.openSnapshotsFolder', async () => {
      if (!ensureEnabled()) {
        return;
      }
      const repo = await pickRepo(git.repositories);
      if (repo) {
        const dir = vscode.Uri.file(path.join(repo.rootUri.fsPath, SNAPSHOT_DIR));
        vscode.commands.executeCommand('revealInExplorer', dir);
      }
    }),
    vscode.commands.registerCommand('envBranchSwitcher.reset', async () => {
      if (!ensureEnabled()) {
        return;
      }
      const repo = await pickRepo(git.repositories);
      if (!repo) {
        return;
      }
      const root = repo.rootUri.fsPath;
      const yes = 'Yes';
      const answer = await vscode.window.showWarningMessage(
        `Are you sure you want to reset? All saved env snapshots in ${SNAPSHOT_DIR}/ for '${path.basename(root)}' will be deleted. Your current env files are not changed.`,
        yes,
        'No',
      );
      if (answer !== yes) {
        return;
      }
      try {
        resetSnapshots(root);
        // Mulai mencatat ulang dari branch sekarang.
        await context.workspaceState.update(LAST_BRANCH_KEY + root, undefined);
        handleChange(context, repo);
        vscode.window.showInformationMessage(`Env Branch Switcher has been reset for '${path.basename(root)}'.`);
      } catch (err) {
        vscode.window.showErrorMessage(t().failed((err as Error).message));
      }
    }),
  );
}

function handleChange(context: vscode.ExtensionContext, repo: Repository): void {
  const branch = repo.state.HEAD?.name;
  if (!branch) {
    return; // repo belum siap atau detached HEAD
  }
  if (!config().get<boolean>('enabled', false)) {
    // Jangan catat branch saat nonaktif: env file tidak ditukar, jadi isinya tetap milik branch
    // terakhir yang tercatat. Mencatat di sini akan membuat env itu tersimpan atas nama branch yang salah.
    return;
  }
  const root = repo.rootUri.fsPath;
  const key = LAST_BRANCH_KEY + root;
  const last = context.workspaceState.get<string>(key);
  if (last === branch) {
    return;
  }
  // Update state dulu supaya event onDidChange beruntun tidak memproses switch yang sama dua kali.
  context.workspaceState.update(key, branch);
  if (last === undefined) {
    return; // pertama kali dipakai: cukup catat branch saat ini
  }

  const envFile = config().get<string>('envFile', '.env');
  try {
    const result = switchEnv(root, envFiles(root), last, branch);
    if (result.kind === 'restored') {
      vscode.window.setStatusBarMessage(t().restored(envFile, result.count, branch), 5000);
      vscode.window.showInformationMessage(t().updated(branch, result.files));
    } else if (result.kind === 'created') {
      vscode.window.showInformationMessage(t().created(branch, result.from, result.files));
    } else {
      vscode.window.showWarningMessage(t().missing(envFile, branch));
    }
  } catch (err) {
    vscode.window.showErrorMessage(t().failed((err as Error).message));
  }
}

async function pickRepo(repos: Repository[]): Promise<Repository | undefined> {
  if (repos.length <= 1) {
    return repos[0];
  }
  const picked = await vscode.window.showQuickPick(
    repos.map((r) => ({ label: path.basename(r.rootUri.fsPath), description: r.rootUri.fsPath, repo: r })),
  );
  return picked?.repo;
}

function ensureEnabled(): boolean {
  if (config().get<boolean>('enabled', false)) {
    return true;
  }
  vscode.window.showWarningMessage(t().notEnabled());
  return false;
}

function envFiles(root: string): string[] {
  const cfg = config();
  return findEnvFiles(root, cfg.get<string>('envFile', '.env'), cfg.get<string[]>('exclude', DEFAULT_EXCLUDE));
}

function config() {
  return vscode.workspace.getConfiguration('envBranchSwitcher');
}

function currentLang(): Lang {
  return resolveLang(config().get<string>('language'), vscode.env.language);
}

function t() {
  return messages(currentLang());
}

export function deactivate(): void {}
