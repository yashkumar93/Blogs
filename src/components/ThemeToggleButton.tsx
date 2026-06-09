"use client";

import { motion } from "motion/react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";

export type AnimationVariant =
  | "circle"
  | "rectangle"
  | "gif"
  | "polygon"
  | "circle-blur";
export type AnimationStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "top-center"
  | "bottom-center"
  | "bottom-up"
  | "top-down"
  | "left-right"
  | "right-left";

const getPositionCoords = (position: AnimationStart) => {
  switch (position) {
    case "top-left":      return { cx: "0",  cy: "0"  };
    case "top-right":     return { cx: "40", cy: "0"  };
    case "bottom-left":   return { cx: "0",  cy: "40" };
    case "bottom-right":  return { cx: "40", cy: "40" };
    case "top-center":    return { cx: "20", cy: "0"  };
    case "bottom-center": return { cx: "20", cy: "40" };
    default:              return { cx: "20", cy: "20" };
  }
};

const getTransformOrigin = (start: AnimationStart) => {
  switch (start) {
    case "top-left":     return "top left";
    case "top-right":    return "top right";
    case "bottom-left":  return "bottom left";
    case "bottom-right": return "bottom right";
    case "top-center":   return "top center";
    case "bottom-center":return "bottom center";
    default:             return "center";
  }
};

const generateSVG = (variant: AnimationVariant, start: AnimationStart) => {
  if (variant === "circle-blur") {
    if (start === "center") {
      return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="20" cy="20" r="18" fill="white" filter="url(%23blur)"/></svg>`;
    }
    const { cx, cy } = getPositionCoords(start);
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><filter id="blur"><feGaussianBlur stdDeviation="2"/></filter></defs><circle cx="${cx}" cy="${cy}" r="18" fill="white" filter="url(%23blur)"/></svg>`;
  }
  if (variant === "circle" && start !== "center") {
    const { cx, cy } = getPositionCoords(start);
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="${cx}" cy="${cy}" r="20" fill="white"/></svg>`;
  }
  return "";
};

export const createAnimation = (
  variant: AnimationVariant,
  start: AnimationStart = "center",
  blur = false,
  url = "",
) => {
  const svg = generateSVG(variant, start);
  const transformOrigin = getTransformOrigin(start);

  if (variant === "rectangle") {
    const clips: Record<string, { from: string; to: string }> = {
      "bottom-up":   { from: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "top-down":    { from: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",         to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "left-right":  { from: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)",          to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
      "right-left":  { from: "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", to: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" },
    };
    const clip = clips[start] ?? clips["bottom-up"];
    const id = `${variant}-${start}${blur ? "-blur" : ""}`;
    return {
      name: id,
      css: `
      ::view-transition-group(root){animation-duration:0.7s;animation-timing-function:var(--expo-out)}
      ::view-transition-new(root){animation-name:reveal-light-${id}${blur ? ";filter:blur(2px)" : ""}}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:none;z-index:-1}
      .dark::view-transition-new(root){animation-name:reveal-dark-${id}${blur ? ";filter:blur(2px)" : ""}}
      @keyframes reveal-dark-${id}{from{clip-path:${clip.from}${blur ? ";filter:blur(8px)" : ""}}to{clip-path:${clip.to}${blur ? ";filter:blur(0)" : ""}}}
      @keyframes reveal-light-${id}{from{clip-path:${clip.from}${blur ? ";filter:blur(8px)" : ""}}to{clip-path:${clip.to}${blur ? ";filter:blur(0)" : ""}}}
      `,
    };
  }

  if (variant === "circle" && start === "center") {
    return {
      name: `circle-center${blur ? "-blur" : ""}`,
      css: `
      ::view-transition-group(root){animation-duration:0.7s;animation-timing-function:var(--expo-out)}
      ::view-transition-new(root){animation-name:reveal-light-circle-center${blur ? "-blur" : ""}${blur ? ";filter:blur(2px)" : ""}}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:none;z-index:-1}
      .dark::view-transition-new(root){animation-name:reveal-dark-circle-center${blur ? "-blur" : ""}${blur ? ";filter:blur(2px)" : ""}}
      @keyframes reveal-dark-circle-center${blur ? "-blur" : ""}{from{clip-path:circle(0% at 50% 50%)${blur ? ";filter:blur(8px)" : ""}}to{clip-path:circle(100% at 50% 50%)${blur ? ";filter:blur(0)" : ""}}}
      @keyframes reveal-light-circle-center${blur ? "-blur" : ""}{from{clip-path:circle(0% at 50% 50%)${blur ? ";filter:blur(8px)" : ""}}to{clip-path:circle(100% at 50% 50%)${blur ? ";filter:blur(0)" : ""}}}
      `,
    };
  }

  if (variant === "circle" && start !== "center") {
    const pos: Record<string, string> = {
      "top-left": "0% 0%", "top-right": "100% 0%",
      "bottom-left": "0% 100%", "bottom-right": "100% 100%",
      "top-center": "50% 0%", "bottom-center": "50% 100%",
    };
    const at = pos[start] ?? "50% 50%";
    const id = `circle-${start}${blur ? "-blur" : ""}`;
    return {
      name: id,
      css: `
      ::view-transition-group(root){animation-duration:1s;animation-timing-function:var(--expo-out)}
      ::view-transition-new(root){animation-name:reveal-light-${id}${blur ? ";filter:blur(2px)" : ""}}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:none;z-index:-1}
      .dark::view-transition-new(root){animation-name:reveal-dark-${id}${blur ? ";filter:blur(2px)" : ""}}
      @keyframes reveal-dark-${id}{from{clip-path:circle(0% at ${at})${blur ? ";filter:blur(8px)" : ""}}to{clip-path:circle(150% at ${at})${blur ? ";filter:blur(0)" : ""}}}
      @keyframes reveal-light-${id}{from{clip-path:circle(0% at ${at})${blur ? ";filter:blur(8px)" : ""}}to{clip-path:circle(150% at ${at})${blur ? ";filter:blur(0)" : ""}}}
      `,
    };
  }

  if (variant === "gif") {
    return {
      name: "gif",
      css: `
      ::view-transition-group(root){animation-timing-function:var(--expo-in)}
      ::view-transition-new(root){mask:url('${url}') center / 0 no-repeat;animation:gif-scale 3s}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:gif-scale 3s}
      @keyframes gif-scale{0%{mask-size:0}10%{mask-size:50vmax}90%{mask-size:50vmax}100%{mask-size:2000vmax}}
      `,
    };
  }

  if (variant === "circle-blur") {
    const id = `circle-blur-${start}`;
    const position = start === "center" ? "center" : start.replace("-", " ");
    return {
      name: id,
      css: `
      ::view-transition-group(root){animation-timing-function:var(--expo-out)}
      ::view-transition-new(root){mask:url('${svg}') ${position} / 0 no-repeat;mask-origin:content-box;animation:${id}-scale 1s;transform-origin:${transformOrigin}}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:${id}-scale 1s;transform-origin:${transformOrigin};z-index:-1}
      @keyframes ${id}-scale{to{mask-size:350vmax}}
      `,
    };
  }

  if (variant === "polygon") {
    const polygonClips: Record<string, { darkFrom: string; darkTo: string; lightFrom: string; lightTo: string }> = {
      "top-left": {
        darkFrom: "polygon(50% -71%, -50% 71%, -50% 71%, 50% -71%)",
        darkTo:   "polygon(50% -71%, -50% 71%, 50% 171%, 171% 50%)",
        lightFrom:"polygon(171% 50%, 50% 171%, 50% 171%, 171% 50%)",
        lightTo:  "polygon(171% 50%, 50% 171%, -50% 71%, 50% -71%)",
      },
      "top-right": {
        darkFrom: "polygon(150% -71%, 250% 71%, 250% 71%, 150% -71%)",
        darkTo:   "polygon(150% -71%, 250% 71%, 50% 171%, -71% 50%)",
        lightFrom:"polygon(-71% 50%, 50% 171%, 50% 171%, -71% 50%)",
        lightTo:  "polygon(-71% 50%, 50% 171%, 250% 71%, 150% -71%)",
      },
    };
    const cp = polygonClips[start] ?? polygonClips["top-left"];
    const id = `polygon-${start}${blur ? "-blur" : ""}`;
    return {
      name: id,
      css: `
      ::view-transition-group(root){animation-duration:0.7s;animation-timing-function:var(--expo-out)}
      ::view-transition-new(root){animation-name:reveal-light-${id}${blur ? ";filter:blur(2px)" : ""}}
      ::view-transition-old(root),.dark::view-transition-old(root){animation:none;z-index:-1}
      .dark::view-transition-new(root){animation-name:reveal-dark-${id}${blur ? ";filter:blur(2px)" : ""}}
      @keyframes reveal-dark-${id}{from{clip-path:${cp.darkFrom}}to{clip-path:${cp.darkTo}}}
      @keyframes reveal-light-${id}{from{clip-path:${cp.lightFrom}}to{clip-path:${cp.lightTo}}}
      `,
    };
  }

  const id = `${variant}-${start}${blur ? "-blur" : ""}`;
  return {
    name: id,
    css: `
    ::view-transition-group(root){animation-timing-function:var(--expo-in)}
    ::view-transition-new(root){mask:url('${svg}') ${start.replace("-"," ")} / 0 no-repeat;mask-origin:content-box;animation:scale-${id} 1s;transform-origin:${transformOrigin}${blur ? ";filter:blur(2px)" : ""}}
    ::view-transition-old(root),.dark::view-transition-old(root){animation:scale-${id} 1s;transform-origin:${transformOrigin};z-index:-1}
    @keyframes scale-${id}{to{mask-size:2000vmax${blur ? ";filter:blur(0)" : ""}}}
    `,
  };
};

const STYLE_ID = "theme-transition-styles";

export function useThemeToggle({
  variant = "circle",
  start = "top-right",
  blur = false,
  gifUrl = "",
}: {
  variant?: AnimationVariant;
  start?: AnimationStart;
  blur?: boolean;
  gifUrl?: string;
} = {}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const applyStyles = useCallback(() => {
    if (typeof window === "undefined") return;
    const { css } = createAnimation(variant, start, blur, gifUrl);
    let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [variant, start, blur, gifUrl]);

  const toggleTheme = useCallback(() => {
    applyStyles();
    const next = theme === "dark" ? "light" : "dark";
    setIsDark(next === "dark");
    if (!document.startViewTransition) { setTheme(next); return; }
    document.startViewTransition(() => setTheme(next));
  }, [theme, setTheme, applyStyles]);

  return { isDark, toggleTheme };
}

export function ThemeToggleButton({
  className = "",
  variant = "circle",
  start = "top-right",
  blur = false,
  gifUrl = "",
  size = 28,
}: {
  className?: string;
  variant?: AnimationVariant;
  start?: AnimationStart;
  blur?: boolean;
  gifUrl?: string;
  size?: number;
}) {
  const { isDark, toggleTheme } = useThemeToggle({ variant, start, blur, gifUrl });

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
      className={className}
      style={{
        width: size,
        height: size,
        padding: 0,
        cursor: "pointer",
        borderRadius: "50%",
        background: "var(--foreground)",
        border: "none",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: 0.8,
        transition: "opacity 0.15s",
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
      onMouseLeave={e => (e.currentTarget.style.opacity = "0.8")}
    >
      <span className="sr-only">Toggle dark mode</span>
      <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
        <motion.g
          animate={{ rotate: isDark ? -180 : 0 }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        >
          <path d="M120 67.5C149.25 67.5 172.5 90.75 172.5 120C172.5 149.25 149.25 172.5 120 172.5" fill="var(--background)" />
          <path d="M120 67.5C90.75 67.5 67.5 90.75 67.5 120C67.5 149.25 90.75 172.5 120 172.5" fill="var(--foreground)" />
        </motion.g>
        <motion.path
          animate={{ rotate: isDark ? 180 : 0 }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
          d="M120 3.75C55.5 3.75 3.75 55.5 3.75 120C3.75 184.5 55.5 236.25 120 236.25C184.5 236.25 236.25 184.5 236.25 120C236.25 55.5 184.5 3.75 120 3.75ZM120 214.5V172.5C90.75 172.5 67.5 149.25 67.5 120C67.5 90.75 90.75 67.5 120 67.5V25.5C172.5 25.5 214.5 67.5 214.5 120C214.5 172.5 172.5 214.5 120 214.5Z"
          fill="var(--background)"
        />
      </svg>
    </button>
  );
}
