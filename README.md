# Env Branch Switcher

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](README.id.md)

A VS Code extension that automatically swaps your `.env` file to match the active git branch.

## How it works

- When you switch from branch `A` → `B` (via the VS Code UI or the terminal), the contents of `.env` are saved to `.env-branches/A.env`.
- If `.env-branches/B.env` exists, it is copied to `.env`.
- If it doesn't exist yet, `.env` is left unchanged and a warning popup is shown. When you later leave `B`, the current `.env` is automatically saved as `B`'s.
- `.env-branches/` is automatically added to `.git/info/exclude` so it never gets committed (your project's `.gitignore` is not modified).

Storage layout inside your project:

```
my-project/
├── .env                      ← active file, follows the current branch
└── .env-branches/
    ├── main.env
    ├── dev.env
    └── feature%2Flogin.env   ← branch "feature/login"
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

If your env file is not `.env` at the repo root (e.g. it lives in a subfolder), also set:

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
| `envBranchSwitcher.envFile` | `.env` | Env file path, relative to the repo root |
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