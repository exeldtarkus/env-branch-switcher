# Development & Publishing

🇬🇧 [English](DEVELOPMENT.md) | 🇮🇩 Bahasa Indonesia

Panduan untuk menjalankan extension ini secara lokal dan mempublikasikannya ke [Open VSX Registry](https://open-vsx.org/).

## Prasyarat

- Node.js 20+ dan npm
- VS Code (atau editor yang kompatibel seperti VSCodium/Cursor)
- Git

---

## Menjalankan secara lokal

### 1. Clone & install dependency

```bash
git clone https://github.com/exeldtarkus/env-branch-switcher.git
cd env-branch-switcher
npm install
```

### 2. Compile

```bash
npm run compile   # compile sekali
npm run watch     # compile otomatis setiap file berubah
```

Hasil compile ada di folder `out/`.

### 3. Jalankan unit test

```bash
npm test
```

### 4. Debug dengan Extension Development Host (F5)

1. Buka folder `env-branch-switcher` di VS Code.
2. Tekan **F5** (atau menu **Run → Start Debugging**, konfigurasi *Run Extension*).
3. Jendela baru **Extension Development Host** akan terbuka dengan extension ini aktif.
4. Di jendela tersebut, buka project uji (lihat langkah berikut), lalu coba pindah branch.
5. Breakpoint di `src/*.ts` bisa dipakai langsung. Setelah mengubah kode, tekan `Ctrl+Shift+F5` untuk restart.

### 5. Membuat project uji

```bash
mkdir -p ~/env-switch-test && cd ~/env-switch-test
git init
git commit --allow-empty -m "init"
echo "APP=main" > .env
mkdir -p .vscode && echo '{ "envBranchSwitcher.enabled": true }' > .vscode/settings.json
```

Skenario uji di terminal jendela Extension Development Host:

```bash
git checkout -b dev     # popup: branch 'dev' belum punya .env; .env tetap APP=main
echo "APP=dev" > .env
git checkout main       # .env kembali APP=main
cat .env-branches/dev.env   # APP=dev
git checkout dev        # .env menjadi APP=dev
git status              # .env-branches/ tidak muncul (ter-exclude)
```

### 6. Build & install `.vsix` secara lokal

```bash
npm run package
code --install-extension env-branch-switcher-0.0.1.vsix
```

Uninstall:

```bash
code --uninstall-extension exeltarkus.env-branch-switcher
```

---

## Deploy ke Open VSX (open-vsx.org)

### 1. Persiapan akun (sekali saja)

1. Buat akun **Eclipse Foundation** di <https://accounts.eclipse.org/user/register>.
   Isi field **GitHub Username** dengan username GitHub kamu (`exeldtarkus`).
2. Login ke <https://open-vsx.org> menggunakan **GitHub**.
3. Buka **Settings** (avatar → *Settings*) → **Log in with Eclipse** untuk menghubungkan akun Eclipse.
4. Tanda tangani **Eclipse Foundation Open VSX Publisher Agreement** yang muncul di halaman tersebut.
5. Buka **Settings → Access Tokens** → **Generate New Token**. Simpan token-nya (hanya ditampilkan sekali).

Simpan token sebagai environment variable agar tidak perlu diketik ulang:

```bash
export OVSX_PAT=<token-kamu>
```

### 2. Buat namespace (sekali saja)

Namespace harus sama dengan field `publisher` di `package.json` (saat ini `exeltarkus`):

```bash
npx ovsx create-namespace exeltarkus -p $OVSX_PAT
```

> Opsional: agar namespace ditandai **verified**, ajukan klaim kepemilikan lewat issue di
> <https://github.com/EclipseFdn/open-vsx.org/issues> (template *Claim namespace ownership*).

### 3. Checklist sebelum publish

- [ ] `version` di `package.json` sudah dinaikkan (Open VSX menolak versi yang sudah pernah dipublish):
      `npm version patch` (atau `minor` / `major`) — otomatis membuat commit & tag git.
- [x] Ada file `LICENSE` di root project (sudah ada, MIT).
- [ ] Field `"repository"` di `package.json` diisi URL GitHub, agar link relatif di README valid:
      ```json
      "repository": { "type": "git", "url": "https://github.com/exeldtarkus/env-branch-switcher.git" }
      ```
- [ ] `npm test` lolos.
- [ ] Cek isi paket: `npx vsce ls`.

### 4. Publish

**Paling mudah: `npm run deploy`.** Saat pertama dijalankan, script meminta access token (input tersembunyi) dan
menyimpannya di `deployment/vsx/token` (di-ignore git, tidak ikut ke VSIX). Lalu script berhenti jika versi ini sudah ada
di Open VSX, membuat namespace jika belum ada, memverifikasi token, menjalankan test, build, dan publish.
Pakai `npm run deploy -- --new-token` untuk mengganti token yang expired.

Atau manual:

Publish langsung dari source (otomatis menjalankan `vscode:prepublish` → compile):

```bash
npx ovsx publish -p $OVSX_PAT
```

Atau publish file `.vsix` yang sudah dibuild:

```bash
npm run package
npx ovsx publish env-branch-switcher-0.0.1.vsix -p $OVSX_PAT
```

Setelah berhasil, extension muncul di:
<https://open-vsx.org/extension/exeltarkus/env-branch-switcher>

Biasanya butuh beberapa menit sampai bisa dicari dan diinstall dari VSCodium / editor lain yang memakai Open VSX.

### 5. (Opsional) Publish otomatis via GitHub Actions

Simpan token di GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**
dengan nama `OVSX_PAT`. Lalu buat `.github/workflows/publish.yml`:

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

Alur rilis:

```bash
npm version patch       # naikkan versi + buat tag vX.Y.Z
git push --follow-tags  # push commit & tag → workflow publish berjalan
```

---