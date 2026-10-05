// Subset dari Git extension API VS Code (extensions/git/src/api/git.d.ts).
import { Event, Uri } from 'vscode';

export interface Branch {
  readonly name?: string;
  readonly commit?: string;
}

export interface RepositoryState {
  readonly HEAD: Branch | undefined;
  readonly onDidChange: Event<void>;
}

export interface Repository {
  readonly rootUri: Uri;
  readonly state: RepositoryState;
}

export interface API {
  readonly repositories: Repository[];
  readonly onDidOpenRepository: Event<Repository>;
}

export interface GitExtension {
  getAPI(version: 1): API;
}
