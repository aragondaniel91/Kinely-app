// Shared, brand-aligned tone styles for the Kinely prototype.
// Soft surfaces in light mode, gently lifted surfaces in dark navy mode.

export const toneStyles = {
  blue: {
    chip: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20",
    avatar: "bg-blue-500/15 text-blue-600 dark:bg-blue-400/20 dark:text-blue-200",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  rose: {
    chip: "bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-400/20",
    avatar: "bg-rose-500/15 text-rose-600 dark:bg-rose-400/20 dark:text-rose-200",
    bar: "bg-rose-500",
    dot: "bg-rose-500",
  },
  amber: {
    chip: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-400/20",
    avatar: "bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-200",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  teal: {
    chip: "bg-teal-50 text-teal-700 ring-teal-100 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-400/20",
    avatar: "bg-teal-500/15 text-teal-600 dark:bg-teal-400/20 dark:text-teal-200",
    bar: "bg-teal-500",
    dot: "bg-teal-500",
  },
  violet: {
    chip: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-400/20",
    avatar: "bg-violet-500/15 text-violet-600 dark:bg-violet-400/20 dark:text-violet-200",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
  },
  green: {
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20",
    avatar: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/20 dark:text-emerald-200",
    bar: "bg-emerald-500",
    dot: "bg-emerald-500",
  },
};

export function tone(key) {
  return toneStyles[key] || toneStyles.blue;
}

// Reusable soft card surface — warm white in light, lifted navy in dark.
export const cardSurface =
  "rounded-3xl border border-white/70 bg-white/85 shadow-[0_14px_40px_rgba(15,23,42,0.07)] backdrop-blur-xl " +
  "dark:border-white/5 dark:bg-white/[0.04] dark:shadow-[0_18px_50px_rgba(0,0,0,0.45)]";

// Slightly softer inner surface for nested rows.
export const innerSurface =
  "rounded-2xl border border-black/5 bg-white/70 dark:border-white/5 dark:bg-white/[0.03]";

export const kicker =
  "text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500";

export const headingText = "text-slate-900 dark:text-slate-50";
export const bodyText = "text-slate-600 dark:text-slate-300";
export const mutedText = "text-slate-500 dark:text-slate-400";
