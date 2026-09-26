"use client";

import { useEffect } from "react";

/**
 * Scroll-reveal ringan untuk halaman publik: saat elemen `[data-reveal]`
 * masuk viewport, tambahkan kelas `reveal-in` (lihat `globals.css`).
 *
 * Satu IntersectionObserver untuk seluruh halaman; menghormati
 * `prefers-reduced-motion` (langsung tampil tanpa animasi).
 */
export const ScrollReveal = () => {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      nodes.forEach((el) => el.classList.add("reveal-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );

    nodes.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
};
