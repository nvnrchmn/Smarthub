/**
 * Konvensi commit SmartHub — Conventional Commits 1.0.0.
 * Contoh: feat(web): tambah landing page publik
 *         fix(api): perbaiki verifikasi HMAC webhook
 *         docs: perbarui runbook pilot
 * Lihat CONTRIBUTING.md untuk aturan lengkap.
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    // Subjek bebas (bahasa Indonesia/Inggris), jangan paksa sentence-case.
    "subject-case": [0],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 200],
    "footer-max-line-length": [2, "always", 200],
  },
};
