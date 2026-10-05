# Development & Publishing

🇬🇧 English | 🇮🇩 [Bahasa Indonesia](DEVELOPMENT.id.md)

A guide to running this extension locally and publishing it to the [Open VSX Registry](https://open-vsx.org/).

## Prerequisites

- Node.js 20+ and npm
- VS Code (or a compatible editor such as VSCodium/Cursor)
- Git

---

## Running locally

### 1. Clone & install dependencies

```bash
git clone https://github.com/exeldtarkus/env-branch-switcher.git
cd env-branch-switcher
npm install
```

### 2. Compile

```bash
npm run compile   # compile once
npm run watch     # recompile on every change
```

Compiled output goes to `out/`.

### 3. Run unit tests

```bash
npm test
```

### 4. Debug with the Extension Development Host (F5)

1. Open the `env-branch-switcher` folder in VS Code.
2. Press **F5** (or **Run → Start Debugging**, configuration *Run Extension*).
3. A new **Extension Development Host** window opens with this extension loaded.
4. In that window, open a test project (see the next step) and try switching branches.
5. Breakpoints in `src/*.ts` work directly. After changing code, press `Ctrl+Shift+F5` to restart.

### 5. Create a test project

```bash
mkdir -p ~/env-switch-test && cd ~/env-switch-test
git init
git commit --allow-empty -m "init"
echo "APP=main" > .env
mkdir -p .vscode && echo '{ "envBranchSwitcher.enabled": true }' > .vscode/settings.json
```

Test scenario in the Extension Development Host terminal:

```bash
git checkout -b dev     # popup: branch 'dev' has no saved .env; .env stays APP=main
echo "APP=dev" > .env
git checkout main       # .env is back to APP=main
cat .env-branches/dev.env   # APP=dev
git checkout dev        # .env becomes APP=dev
git status              # .env-branches/ does not show up (excluded)
```

### 6. Build & install the `.vsix` locally

```bash
npm run package
code --install-extension env-branch-switcher-0.0.1.vsix
```

Uninstall:

```bash
code --uninstall-extension exeltarkus.env-branch-switcher
```

---

## Deploying to Open VSX (open-vsx.org)

### 1. Account setup (one time)

1. Create an **Eclipse Foundation** account at <https://accounts.eclipse.org/user/register>.
   Fill in the **GitHub Username** field with your GitHub username (`exeldtarkus`).
2. Log in to <https://open-vsx.org> with **GitHub**.
3. Go to **Settings** (avatar → *Settings*) → **Log in with Eclipse** to link your Eclipse account.
4. Sign the **Eclipse Foundation Open VSX Publisher Agreement** shown on that page.
5. Go to **Settings → Access Tokens** → **Generate New Token**. Save the token (it is shown only once).

Store the token in an environment variable so you don't have to retype it:

```bash
export OVSX_PAT=<your-token>
```

### 2. Create the namespace (one time)

The namespace must match the `publisher` field in `package.json` (currently `exeltarkus`):

```bash
npx ovsx create-namespace exeltarkus -p $OVSX_PAT
```

> Optional: to get the namespace marked as **verified**, file an ownership claim at
> <https://github.com/EclipseFdn/open-vsx.org/issues> (template *Claim namespace ownership*).

### 3. Pre-publish checklist

- [ ] `version` in `package.json` has been bumped (Open VSX rejects versions that were already published):
      `npm version patch` (or `minor` / `major`) — also creates a git commit & tag.
- [x] A `LICENSE` file exists at the project root (already present, MIT).
- [ ] The `"repository"` field in `package.json` points to GitHub, so relative links in the README work:
      ```json
      "repository": { "type": "git", "url": "https://github.com/exeldtarkus/env-branch-switcher.git" }
      ```
- [ ] `npm test` passes.
- [ ] Check the package contents: `npx vsce ls`.

### 4. Publish

**Easiest: `npm run deploy`.** On the first run it asks for your access token (hidden input) and saves it to
`deployment/vsx/token` (git-ignored, excluded from the VSIX). It then skips if this version is already on Open VSX,
creates the namespace if needed, verifies the token, runs the tests, packages, and publishes.
Use `npm run deploy -- --new-token` to replace an expired token.

Or manually:

Publish straight from source (runs `vscode:prepublish` → compile automatically):

```bash
npx ovsx publish -p $OVSX_PAT
```

Or publish a prebuilt `.vsix`:

```bash
npm run package
npx ovsx publish env-branch-switcher-0.0.1.vsix -p $OVSX_PAT
```

Once published, the extension is available at:
<https://open-vsx.org/extension/exeltarkus/env-branch-switcher>

It usually takes a few minutes before it can be searched and installed from VSCodium / other editors that use Open VSX.

### 5. (Optional) Automatic publishing with GitHub Actions

Store the token in the GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
named `OVSX_PAT`. Then create `.github/workflows/publish.yml`:

```yaml
name: Publish to Open VSX

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - run: npx ovsx publish -p ${{ secrets.OVSX_PAT }}
```

Release flow:

```bash
npm version patch       # bump version + create tag vX.Y.Z
git push --follow-tags  # push commit & tag → publish workflow runs
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Unknown publisher` / namespace not found | Run the *Create the namespace* step; make sure it matches `publisher` in `package.json`. |
| `You must sign the Publisher Agreement` | Log in to open-vsx.org → Settings → link your Eclipse account & sign the agreement. |
| `Extension ... version x.y.z is already published` | Bump the version with `npm version patch`. |
| `LICENSE not found` | Add a `LICENSE` file at the project root. |
| `Couldn't detect the repository` when packaging | Fill in `repository` in `package.json`, or use `npm run package`. |
| Extension doesn't react in F5 | Make sure the folder opened in the Extension Development Host is a git repo and `envBranchSwitcher.enabled` is `true`. |
