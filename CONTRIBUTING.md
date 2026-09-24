# Panduan Kontribusi SmartHub

Dokumen ini menjelaskan alur kerja Git, konvensi commit, dan praktik terbaik yang dipakai di repo ini. Tujuannya: riwayat yang mudah dibaca, review yang cepat, dan rilis yang dapat diprediksi.

## 1. Strategi branching (trunk-based dengan branch pendek)

Kami memakai **trunk-based development**: `main` selalu dalam kondisi dapat dirilis, dan pekerjaan dilakukan pada branch berumur pendek yang di-merge lewat Pull Request.

```
main ──●──●──────────●──────────●──► (selalu rilis-able, dilindungi)
         \            \          /
          ●─● feat/…  ●─● fix/…  (branch pendek, ≤ 2–3 hari)
```

| Branch | Pola | Kegunaan |
|---|---|---|
| Tetap | `main` | Sumber kebenaran; dilindungi, tidak boleh push langsung |
| Fitur | `feat/<ringkas>` | Fitur baru, mis. `feat/public-landing-page` |
| Perbaikan | `fix/<ringkas>` | Perbaikan bug |
| Pemeliharaan | `chore/<ringkas>`, `refactor/<ringkas>`, `docs/<ringkas>` | Non-fitur |
| Rilis (opsional) | `release/<x.y.z>` | Stabilisasi sebelum tag |
| Panas | `hotfix/<ringkas>` | Perbaikan darurat dari tag rilis |

Aturan:
- Satu branch = satu tujuan. Hindari mencampur fitur dan refactor besar.
- Rebase ke `main` sebelum minta review: `git fetch origin && git rebase origin/main`.
- Branch hidup pendek; merge segera setelah lolos review & CI.
- **Jangan** push langsung ke `main`. Aktifkan branch protection (wajib PR + CI hijau + minimal 1 review).

## 2. Konvensi commit (Conventional Commits)

Format:

```
<type>(<scope opsional>): <subjek>

<body opsional>

<footer opsional: BREAKING CHANGE, Closes #123>
```

`type` yang diizinkan: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
`scope` disarankan: `api`, `web`, `shared`, `docs`, `pipeline`, `billing`, `kyc`, `deps`.

Contoh:

```
feat(web): tambah halaman publik dengan hero dan CTA
fix(api): verifikasi HMAC webhook memakai raw body
docs: tambah runbook pilot KYC/payout
refactor(shared): pisahkan skema KYC ke modul sendiri
```

Aturan ditegakkan otomatis oleh **commitlint** pada hook `commit-msg`. Commit yang tidak sesuai akan ditolak.

## 3. Hook lokal & kualitas otomatis

Husky menjalankan:
- `pre-commit` → `lint-staged` (ESLint `--fix` + Prettier pada berkas yang di-stage).
- `commit-msg` → `commitlint`.

Aktifkan sekali setelah clone:

```bash
pnpm install        # menjalankan `husky` (prepare) otomatis
```

Jalankan pemeriksaan penuh sebelum PR:

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

## 4. Alur Pull Request

1. Sinkronkan: `git switch main && git pull --ff-only`
2. Buat branch: `git switch -c feat/<ringkas>`
3. Kerjakan, commit kecil & bermakna (Conventional Commits).
4. Push: `git push -u origin feat/<ringkas>`
5. Buka PR (template otomatis terisi). Isi ringkasan, cara uji, dan checklist.
6. Pastikan **CI hijau** (`quality`: prisma → lint → typecheck → test → build).
7. Minimal 1 review (CODEOWNERS). Address review dengan commit baru, jangan force-push branch yang sedang direview kecuali disepakati.
8. Merge: **Squash and merge** (judul PR mengikuti Conventional Commits) agar riwayat `main` rapi. Hapus branch setelah merge.

## 5. Versioning & rilis

- **SemVer**: `MAJOR.MINOR.PATCH`.
- Tag rilis: `git tag -a v1.2.0 -m "Release v1.2.0" && git push origin v1.2.0`.
- `BREAKING CHANGE:` pada footer memicu `MAJOR`.
- Deploy API/web dilakukan dari lingkungan masing-masing; lihat README & dokumen platform.

## 6. Aturan yang tidak boleh dilanggar

- **Jangan commit secret** (`.env`, kunci API, kredensial DB). Hanya `.env.example` yang masuk repo.
- **Jangan commit PII** nyata (NIK, berkas KTP). Data KYC disimpan di Logikraf Payment Hub, bukan di repo.
- **Jangan mengubah migrasi yang sudah di-merge**; buat migrasi baru.
- Perubahan skema Prisma: tambah migrasi, terapkan ke DB dev **dan** test, lalu `pnpm prisma:generate`.
- Perbarui dokumentasi (`docs/`) bila perilaku berubah.

## 7. Konvensi kode

- TypeScript strict; hindari `any`.
- API: pola `routes → controller → service → repository`; hanya repository menyentuh Prisma.
- Web: akses data lewat BFF (`app/api/bff/[...path]`), bukan langsung dari komponen.
- UI: komponen di `components/ui` (ShadcnUI) dan token warna di `globals.css`; dukung mode terang/gelap.
- Aksesibilitas: elemen semantik, `aria-label` untuk aksi ikon, focus state terlihat, kontras memadai.
