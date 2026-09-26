import type { Transition, Variants } from "framer-motion";

/**
 * Token motion bergaya iOS: durasi singkat, easing tegas, dan spring lembut.
 * Dipakai bersama oleh primitif motion agar feedback visual konsisten.
 */
export const EASE_IOS = [0.22, 1, 0.36, 1] as const;
export const EASE_IOS_IN_OUT = [0.4, 0, 0.2, 1] as const;

export const DURATION = {
  fast: 0.18,
  base: 0.28,
  slow: 0.45,
} as const;

/** Spring khas iOS: responsif, minim overshoot. */
export const springIos: Transition = { type: "spring", stiffness: 320, damping: 30, mass: 0.9 };
export const springSoft: Transition = { type: "spring", stiffness: 220, damping: 26, mass: 1 };
export const springSnappy: Transition = { type: "spring", stiffness: 460, damping: 34 };

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE_IOS } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_IOS } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: springIos },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_IOS } },
};

/** Transisi antar halaman: fade + slide-up halus, khas aplikasi native. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE_IOS } },
  exit: { opacity: 0, y: -6, transition: { duration: DURATION.fast, ease: EASE_IOS } },
};
