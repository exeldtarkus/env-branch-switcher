# Env Branch Switcher

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](docs/README.id.md)

A VS Code extension that automatically swaps your `.env` file to match the active git branch.

## How it works

- Every `.env` file in the project is found automatically — at the root or in any subfolder (e.g. `src/main/resources/.env`). Build/dependency folders such as `node_modules`, `target`, `build`, `bin` are skipped.
- When you switch from branch `A` → `B` (via the VS Code UI or the terminal), all of those `.env` files are saved to `.env-branches/A/`, keeping their folder structure.
- If `.env-branches/B/` exists, its files are copied back to their original locations.
- If it doesn't exist yet, the `.env` files are left unchanged and a warning popup is shown. When you later leave `B`, the current `.env` files are automatically saved as `B`'s.
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
    └── feature%2Flogin/          ← branch "feature/login"
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
- **Status bar** `✓ .env restored for branch 'dev'` → swapped successfully.
- **Warning popup** `Branch 'dev' has no saved .env...` → `.env` was left unchanged.

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
| `Env Branch Switcher: Save .env for current branch` | Save the current `.env` as the active branch's snapshot |
| `Env Branch Switcher: Open snapshots folder` | Reveal `.env-branches/` in the Explorer |

## Notes

- Detached HEAD (e.g. `git checkout <commit>`) is ignored.
- If you switch branches while VS Code is closed, the swap happens when VS Code is reopened.
- Command titles and setting descriptions are shown in Indonesian only when the VS Code display language is Indonesian (requires a language pack). Notifications can be forced to Indonesian with `"envBranchSwitcher.language": "id"`.
- Snapshots live only on your local machine; deleting `.env-branches/` deletes all saved `.env` files.

---
## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for running locally and publishing to Open VSX.
