# Env Branch Switcher

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](docs/README.id.md)

A VS Code extension that automatically swaps your `.env` file to match the active git branch.

## How it works

- Every `.env` file in the project is found automatically — at the root or in any subfolder (e.g. `src/main/resources/.env`). Build/dependency folders such as `node_modules`, `target`, `build`, `bin` are skipped.
- When you switch from branch `A` → `B` (via the VS Code UI or the terminal), all of those `.env` files are saved to `.env-branches/A/`, keeping their folder structure.
- If `.env-branches/B/` exists, its files are copied back to their original locations.
- If it doesn't exist yet, the `.env` files are left unchanged and immediately saved as `B`'s snapshot (inherited from `A`), with an info popup. Edits you make on `B` are saved when you leave it (the inherited version goes to `.backup/`).
- `.env-branches/` is automatically added to `.git/info/exclude` so it never gets committed (your project's `.gitignore` is not modified).

Storage layout inside your project:

```
my-project/
├── .env                          ← active files, follow the current branch
├── src/main/resources/.env
└── .env-branches/
    ├── main/
    │   ├── .env
    │   └── src/main/resources/.env
    ├── dev/
    ├── feature%2Flogin/          ← branch "feature/login"
    └── .backup/                  ← previous snapshots (last 5 per branch)
```

---

## Running it in your project

### 1. Build & install the extension

```bash
cd /home/exel_tarkus/ExelFiles/experiment/env-branch-switcher
npm install
npm run package
code --install-extension env-branch-switcher-0.0.1.vsix
```

Then reload VS Code (`Ctrl+Shift+P` → **Developer: Reload Window**).

### 2. Enable it for your project

The extension is **disabled by default**. Enable it per project by creating/editing
`.vscode/settings.json` at your project root:

```json
{
  "envBranchSwitcher.enabled": true
}
```

Or via the Command Palette: `Ctrl+Shift+P` → **Env Branch Switcher: Activation** → `true`.

Or via the UI: `Ctrl+,` → **Workspace** tab → search `Env Branch Switcher` → tick **Enabled**.

By default every file named `.env` anywhere in the project is managed. To manage only one specific file, set its path relative to the repo root:

```json
{
  "envBranchSwitcher.enabled": true,
  "envBranchSwitcher.envFile": "backend/.env"
}
```

### 3. Save `.env` for the current branch (recommended)

After enabling, save the `.env` of the branch you're currently on:

`Ctrl+Shift+P` → **Env Branch Switcher: Save .env for current branch**

> Skipping this is safe: the current branch's `.env` is saved automatically the first time you switch branches.

### 4. Use git as usual

```bash
git checkout dev     # main's .env is saved; dev's .env is restored (or a popup if none exists)
# edit .env for dev...
git checkout main    # dev's .env is saved; main's .env is restored
```

Notifications:
- **Pop-up** `Env updated from the saved snapshot of branch 'dev': .env, src/main/resources/.env` (plus a status bar message) → swapped successfully. Only shown when the branch already has a snapshot.
- **Info popup** `No snapshot for branch 'dev' yet — created one from the current env (from 'main'): .env` → `.env` was left unchanged and saved as `dev`'s snapshot.
- **Warning popup** `Branch 'dev' has no saved .env...` → no `.env` file exists in the project, nothing was saved.

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `envBranchSwitcher.enabled` | `false` | Automatically swap `.env` when switching branches |
| `envBranchSwitcher.envFile` | `.env` | Env file name to find anywhere in the project, or a path relative to the repo root (e.g. `backend/.env`) |
| `envBranchSwitcher.exclude` | `[".git", ".env-branches", "node_modules", "target", "build", "bin", "out", "dist", "vendor", ".gradle", ".idea", ".venv", "venv", "__pycache__"]` | Folder names skipped when searching for env files |
| `envBranchSwitcher.language` | `auto` | Notification language: `auto` (follow VS Code), `en`, or `id` |

## Commands

| Command | What it does |
|---|---|
| `Env Branch Switcher: Activation` | Choose `true` / `false` to set `envBranchSwitcher.enabled` in the workspace settings (default `false`) |
| `Env Branch Switcher: Save .env for current branch` | Save the current `.env` as the active branch's snapshot (only while activated) |
| `Env Branch Switcher: Open snapshots folder` | Reveal `.env-branches/` in the Explorer (only while activated) |
| `Env Branch Switcher: Reset (delete all saved snapshots)` | After a Yes/No confirmation, delete `.env-branches/` (including backups) and start tracking again from the current branch. Your current `.env` files are not changed (only while activated) |

## Notes

- While deactivated, branch switches are not tracked. After activating again, the current `.env` is treated as belonging to the branch that was active when the extension was last enabled, so it is never saved under the wrong branch.
- Before a snapshot is overwritten with different content, the old one is moved to `.env-branches/.backup/<branch>/<timestamp>/` (the 5 most recent are kept).
- Detached HEAD (e.g. `git checkout <commit>`) is ignored.
- If you switch branches while VS Code is closed, the swap happens when VS Code is reopened.
- Command titles and setting descriptions are shown in Indonesian only when the VS Code display language is Indonesian (requires a language pack). Notifications can be forced to Indonesian with `"envBranchSwitcher.language": "id"`.
- Snapshots live only on your local machine; deleting `.env-branches/` deletes all saved `.env` files.

---
## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for running locally and publishing to Open VSX.
