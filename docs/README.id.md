# Env Branch Switcher

🇬🇧 [English](../README.md) | 🇮🇩 Bahasa Indonesia

Extension VS Code yang otomatis menukar file `.env` sesuai git branch yang sedang aktif.

## Cara kerja

- Semua file `.env` di project dicari otomatis, baik di root maupun di subfolder (mis. `src/main/resources/.env`). Folder build/dependency seperti `node_modules`, `target`, `build`, `bin` dilewati.
- Saat pindah branch `A` → `B` (lewat UI VS Code maupun terminal), semua file `.env` tersebut disimpan ke `.env-branches/A/` dengan struktur folder yang sama.
- Jika `.env-branches/B/` ada, file-filenya disalin kembali ke lokasi asalnya.
- Jika belum ada, file `.env` dibiarkan apa adanya dan muncul popup peringatan. Saat nanti pindah dari `B`, file `.env` saat itu otomatis tersimpan sebagai milik `B`.
- `.env-branches/` otomatis ditambahkan ke `.git/info/exclude` agar tidak ter-commit (`.gitignore` project tidak diubah).

Lokasi penyimpanan di project kamu:

```
my-project/
├── .env                          ← file aktif, isinya mengikuti branch sekarang
├── src/main/resources/.env
└── .env-branches/
    ├── main/
    │   ├── .env
    │   └── src/main/resources/.env
    ├── dev/
    └── feature%2Flogin/          ← branch "feature/login"
```

---

## Cara menjalankan di project

### 1. Build & install extension

```bash
cd /home/exel_tarkus/ExelFiles/experiment/env-branch-switcher
npm install
npm run package
code --install-extension env-branch-switcher-0.0.1.vsix
```

Lalu reload VS Code (`Ctrl+Shift+P` → **Developer: Reload Window**).

### 2. Aktifkan di project

Extension **nonaktif secara default**. Aktifkan per project dengan membuat/mengedit
`.vscode/settings.json` di root project kamu:

```json
{
  "envBranchSwitcher.enabled": true
}
```

Atau lewat Command Palette: `Ctrl+Shift+P` → **Env Branch Switcher: Aktifkan untuk workspace ini**.

Atau lewat UI: `Ctrl+,` → tab **Workspace** → cari `Env Branch Switcher` → centang **Enabled**.

Secara default semua file bernama `.env` di seluruh project dikelola. Untuk mengelola satu file tertentu saja, isi path-nya relatif terhadap root repo:

```json
{
  "envBranchSwitcher.enabled": true,
  "envBranchSwitcher.envFile": "backend/.env"
}
```

### 3. Simpan `.env` untuk branch saat ini (disarankan)

Setelah mengaktifkan, simpan dulu `.env` branch yang sedang aktif:

`Ctrl+Shift+P` → **Env Branch Switcher: Simpan .env untuk branch saat ini** (English: *Save .env for current branch*)

> Tanpa langkah ini pun aman: `.env` branch saat ini akan otomatis tersimpan saat kamu pertama kali pindah branch.

### 4. Pakai seperti biasa

```bash
git checkout dev     # .env milik main disimpan; .env milik dev dipulihkan (atau popup jika belum ada)
# ubah .env untuk kebutuhan dev...
git checkout main    # .env milik dev disimpan; .env milik main dipulihkan
```

Notifikasi:
- **Status bar** `✓ .env dipulihkan untuk branch 'dev'` → berhasil ditukar.
- **Popup peringatan** `Branch 'dev' belum memiliki .env tersimpan...` → `.env` tidak diubah.

---

## Settings

| Setting | Default | Keterangan |
|---|---|---|
| `envBranchSwitcher.enabled` | `false` | Aktifkan penukaran `.env` otomatis saat pindah branch |
| `envBranchSwitcher.envFile` | `.env` | Nama file env yang dicari di seluruh project, atau path relatif terhadap root repo (mis. `backend/.env`) |
| `envBranchSwitcher.exclude` | `[".git", ".env-branches", "node_modules", "target", "build", "bin", "out", "dist", "vendor", ".gradle", ".idea", ".venv", "venv", "__pycache__"]` | Nama folder yang dilewati saat mencari file env |
| `envBranchSwitcher.language` | `auto` | Bahasa notifikasi: `auto` (ikut bahasa VS Code), `en`, atau `id` |

## Commands

| Command | Fungsi |
|---|---|
| `Env Branch Switcher: Aktifkan untuk workspace ini` | Set `envBranchSwitcher.enabled` ke `true` di workspace settings (hanya muncul saat nonaktif) |
| `Env Branch Switcher: Nonaktifkan untuk workspace ini` | Set `envBranchSwitcher.enabled` ke `false` di workspace settings (hanya muncul saat aktif) |
| `Env Branch Switcher: Simpan .env untuk branch saat ini` | Simpan `.env` sekarang sebagai milik branch aktif |
| `Env Branch Switcher: Buka folder snapshot` | Buka folder `.env-branches/` di Explorer |

## Catatan

- Detached HEAD (misalnya `git checkout <commit>`) diabaikan.
- Jika branch diganti saat VS Code tertutup, penukaran dilakukan saat VS Code dibuka kembali.
- Bahasa Indonesia untuk judul command & deskripsi settings hanya muncul jika bahasa tampilan VS Code diatur ke Indonesia (butuh language pack). Notifikasi bisa dipaksa ke Bahasa Indonesia dengan `"envBranchSwitcher.language": "id"`.
- Snapshot hanya ada di mesin lokal; menghapus folder `.env-branches/` berarti menghapus semua `.env` tersimpan.

---

## Development

Lihat [DEVELOPMENT.id.md](DEVELOPMENT.id.md) untuk panduan lengkap menjalankan lokal dan publish ke Open VSX.

```bash
npm install
npm run watch     # compile otomatis saat file berubah
npm test          # compile + unit test
```

Untuk mencoba tanpa install: buka folder ini di VS Code lalu tekan **F5**. Akan terbuka jendela
*Extension Development Host* — buka project uji di jendela tersebut, aktifkan setting, lalu coba pindah branch.
