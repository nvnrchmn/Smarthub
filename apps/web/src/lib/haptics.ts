/**
 * Getaran halus untuk feedback taktil (jika perangkat mendukung).
 * Selalu aman dipanggil; gagal senyap di lingkungan tanpa `navigator.vibrate`.
 */
export const haptic = (pattern: number | number[] = 8): void => {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* diabaikan */
  }
};
