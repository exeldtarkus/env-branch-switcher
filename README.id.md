# Env Branch Switcher

🇬🇧 [English](README.md) | 🇮🇩 Bahasa Indonesia

Extension VS Code yang otomatis menukar file `.env` sesuai git branch yang sedang aktif.

## Cara kerja

- Saat pindah branch `A` → `B` (lewat UI VS Code maupun terminal), isi `.env` disimpan ke `.env-branches/A.env`.
- Jika `.env-branches/B.env` ada, isinya disalin ke `.env`.
- Jika belum ada, `.env` dibiarkan apa adanya dan muncul popup peringatan. Saat nanti pindah dari `B`, isi `.env` saat itu otomatis tersimpan sebagai milik `B`.
- `.env-branches/` otomatis ditambahkan ke `.git/info/exclude` agar tidak ter-commit (`.gitignore` project tidak diubah).

Lokasi penyimpanan di project kamu:

```
my-project/
├── .env                      ← file aktif, isinya mengikuti branch sekarang
└── .env-branches/
    ├── main.env
    ├── dev.env
    └── feature%2Flogin.env   ← branch "feature/login"
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

Atau lewat UI: `Ctrl+,` → tab **Workspace** → cari `Env Branch Switcher` → centang **Enabled**.

Jika file env kamu bukan `.env` di root (misalnya di subfolder), atur juga:

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
| `envBranchSwitcher.envFile` | `.env` | Path file env relatif terhadap root repo |
| `envBranchSwitcher.language` | `auto` | Bahasa notifikasi: `auto` (ikut bahasa VS Code), `en`, atau `id` |

## Commands

| Command | Fungsi |
|---|---|
| `Env Branch Switcher: Simpan .env untuk branch saat ini` | Simpan `.env` sekarang sebagai milik branch aktif |
| `Env Branch Switcher: Buka folder snapshot` | Buka folder `.env-branches/` di Explorer |

## Catatan

- Detached HEAD (misalnya `git checkout <commit>`) diabaikan.
- Jika branch diganti saat VS Code tertutup, penukaran dilakukan saat VS Code dibuka kembali.
- Bahasa Indonesia untuk judul command & deskripsi settings hanya muncul jika bahasa tampilan VS Code diatur ke Indonesia (butuh language pack). Notifikasi bisa dipaksa ke Bahasa Indonesia dengan `"envBranchSwitcher.language": "id"`.
- Snapshot hanya ada di mesin lokal; menghapus folder `.env-branches/` berarti menghapus semua `.env` tersimpan.

---

## Development

```bash
npm install
npm run watch     # compile otomatis saat file berubah
npm test          # compile + unit test
```

Untuk mencoba tanpa install: buka folder ini di VS Code lalu tekan **F5**. Akan terbuka jendela
*Extension Development Host* — buka project uji di jendela tersebut, aktifkan setting, lalu coba pindah branch.
