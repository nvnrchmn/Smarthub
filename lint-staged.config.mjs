/**
 * Pre-commit: format + lint hanya berkas yang di-stage agar cepat.
 * Typecheck/build penuh dijalankan di CI (lihat .github/workflows/ci.yml).
 */
export default {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{js,mjs,cjs,json,md,yml,yaml,css}": ["prettier --write"],
};
