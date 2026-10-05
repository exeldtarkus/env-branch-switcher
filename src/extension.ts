import * as vscode from 'vscode';
import * as path from 'path';
import { GitExtension, Repository } from './git';
import { SNAPSHOT_DIR, saveSnapshot, switchEnv } from './envSwitcher';
import { messages, resolveLang } from './messages';

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
  context.subscriptions.push(git.onDidOpenRepository(watch));

  context.subscriptions.push(
    vscode.commands.registerCommand('envBranchSwitcher.saveSnapshot', async () => {
      const repo = await pickRepo(git.repositories);
      const branch = repo?.state.HEAD?.name;
      if (!repo || !branch) {
        vscode.window.showWarningMessage(t().noActiveBranch());
        return;
      }
      const envFile = config().get<string>('envFile', '.env');
      if (saveSnapshot(repo.rootUri.fsPath, envFile, branch)) {
        vscode.window.showInformationMessage(t().saved(envFile, branch));
      } else {
        vscode.window.showWarningMessage(t().envNotFound(envFile));
      }
    }),
    vscode.commands.registerCommand('envBranchSwitcher.openSnapshotsFolder', async () => {
      const repo = await pickRepo(git.repositories);
      if (repo) {
        const dir = vscode.Uri.file(path.join(repo.rootUri.fsPath, SNAPSHOT_DIR));
        vscode.commands.executeCommand('revealInExplorer', dir);
      }
    }),
  );
}

function handleChange(context: vscode.ExtensionContext, repo: Repository): void {
  const branch = repo.state.HEAD?.name;
  if (!branch) {
    return; // repo belum siap atau detached HEAD
  }
  const root = repo.rootUri.fsPath;
  const key = LAST_BRANCH_KEY + root;
  const last = context.workspaceState.get<string>(key);
  if (last === branch) {
    return;
  }
  // Update state dulu supaya event onDidChange beruntun tidak memproses switch yang sama dua kali.
  context.workspaceState.update(key, branch);
  if (last === undefined || !config().get<boolean>('enabled', false)) {
    return; // pertama kali dipakai: cukup catat branch saat ini
  }

  const envFile = config().get<string>('envFile', '.env');
  try {
    const result = switchEnv(root, envFile, last, branch);
    if (result.kind === 'restored') {
      vscode.window.setStatusBarMessage(t().restored(envFile, branch), 5000);
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

function config() {
  return vscode.workspace.getConfiguration('envBranchSwitcher');
}

function t() {
  return messages(resolveLang(config().get<string>('language'), vscode.env.language));
}

export function deactivate(): void {}
