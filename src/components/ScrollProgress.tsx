"use client";

import NumberFlow from "@number-flow/react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "motion/react";
import { useState } from "react";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const [progressPercent, setProgressPercent] = useState(0);

  const clampedProgress = useTransform(scrollYProgress, (value) =>
    Math.min(Math.max(value, 0), 1),
  );
  const progressAsPercent = useTransform(clampedProgress, (value) =>
    Math.round(value * 100),
  );

  useMotionValueEvent(progressAsPercent, "change", (value) => {
    setProgressPercent(value);
  });

  const svgRadius = 18;
  const circumference = 2 * Math.PI * svgRadius;

  return (
    <motion.div
      drag
      dragMomentum={false}
      className="group fixed bottom-4 right-4 z-50 cursor-grab active:cursor-grabbing"
    >
      <NumberFlow
        value={progressPercent}
        className="absolute top-1 flex h-8 -translate-y-full items-center justify-center px-4 text-xs font-medium tabular-nums opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: "var(--muted-foreground)" }}
        suffix="%"
      />
      <div
        className="flex size-12 items-center justify-center rounded-2xl border backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--background) 80%, transparent)", borderColor: "var(--border)" }}
      >
        <svg className="size-10" viewBox="0 0 48 48" role="presentation">
          <circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="3"
            className="opacity-30"
            fill="none"
          />
          <motion.circle
            cx="24"
            cy="24"
            r={svgRadius}
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            style={{
              pathLength: clampedProgress,
              rotate: -90,
              transformOrigin: "50% 50%",
            }}
          />
        </svg>
      </div>
    </motion.div>
  );
}
