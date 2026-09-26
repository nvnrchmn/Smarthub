"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import {
  DURATION,
  EASE_IOS,
  pageVariants,
  staggerContainer,
  staggerItem,
  springSnappy,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Props `div` motion tanpa properti animasi yang dikelola internal. */
type MotionDivProps = Omit<
  HTMLMotionProps<"div">,
  "variants" | "initial" | "animate" | "whileInView" | "viewport" | "transition"
>;

export const FadeIn = ({
  children,
  className,
  variant = "fadeUp",
  delay = 0,
  ...props
}: MotionDivProps & {
  children: ReactNode;
  variant?: "fade" | "fadeUp" | "scale";
  delay?: number;
}) => {
  const reduce = useReducedMotion();
  const hidden =
    variant === "fade"
      ? { opacity: 0 }
      : variant === "scale"
        ? { opacity: 0, scale: 0.96 }
        : { opacity: 0, y: 12 };
  const show =
    variant === "fade"
      ? { opacity: 1 }
      : variant === "scale"
        ? { opacity: 1, scale: 1 }
        : { opacity: 1, y: 0 };

  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      variants={{
        hidden,
        show: { ...show, transition: { delay, duration: DURATION.base, ease: EASE_IOS } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const Stagger = ({
  children,
  className,
  ...props
}: MotionDivProps & { children: ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-10%" }}
      variants={reduce ? undefined : staggerContainer}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({
  children,
  className,
  ...props
}: MotionDivProps & { children: ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : staggerItem} {...props}>
      {children}
    </motion.div>
  );
};

export const Pressable = ({
  children,
  className,
  ...props
}: HTMLMotionProps<"div"> & { children: ReactNode }) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...props}
      className={cn(className)}
      whileHover={reduce ? undefined : { scale: 1.01 }}
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={springSnappy}
    >
      {children}
    </motion.div>
  );
};

/** Pembungkus transisi halaman (dipakai `app/(app)/template.tsx`). */
export const PageTransition = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={reduce ? undefined : pageVariants}
    >
      {children}
    </motion.div>
  );
};
