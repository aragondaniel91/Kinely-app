export const APP_COLORS = [
  {
    id: "blue",
    label: "Blue",
    labelEs: "Azul",
    hex: "#3b82f6",
    softHex: "#eff6ff",
    dot: "bg-blue-500",
    swatch: "bg-blue-400",
    bg: "bg-blue-50",
    bgStrong: "bg-blue-200",
    border: "border-blue-300",
    borderStrong: "border-blue-400",
    ring: "ring-blue-200",
    text: "text-blue-700",
    textStrong: "text-blue-800",
    stripe: "bg-blue-500",
    chip: "bg-blue-400/50 text-blue-900",
  },
  {
    id: "amber",
    label: "Amber",
    labelEs: "Ámbar",
    hex: "#f59e0b",
    softHex: "#fffbeb",
    dot: "bg-amber-500",
    swatch: "bg-amber-400",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-200",
    border: "border-amber-300",
    borderStrong: "border-amber-400",
    ring: "ring-amber-200",
    text: "text-amber-700",
    textStrong: "text-amber-800",
    stripe: "bg-amber-500",
    chip: "bg-amber-400/50 text-amber-900",
  },
  {
    id: "green",
    label: "Green",
    labelEs: "Verde",
    hex: "#10b981",
    softHex: "#ecfdf5",
    dot: "bg-emerald-500",
    swatch: "bg-green-400",
    bg: "bg-emerald-50",
    bgStrong: "bg-green-200",
    border: "border-emerald-300",
    borderStrong: "border-green-400",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    textStrong: "text-green-800",
    stripe: "bg-emerald-500",
    chip: "bg-green-400/50 text-green-900",
  },
  {
    id: "violet",
    label: "Violet",
    labelEs: "Violeta",
    hex: "#8b5cf6",
    softHex: "#f5f3ff",
    dot: "bg-violet-500",
    swatch: "bg-violet-400",
    bg: "bg-violet-50",
    bgStrong: "bg-violet-200",
    border: "border-violet-300",
    borderStrong: "border-violet-400",
    ring: "ring-violet-200",
    text: "text-violet-700",
    textStrong: "text-violet-800",
    stripe: "bg-violet-500",
    chip: "bg-violet-400/50 text-violet-900",
  },
  {
    id: "rose",
    label: "Rose",
    labelEs: "Rosa",
    hex: "#f43f5e",
    softHex: "#fff1f2",
    dot: "bg-rose-500",
    swatch: "bg-rose-400",
    bg: "bg-rose-50",
    bgStrong: "bg-rose-200",
    border: "border-rose-300",
    borderStrong: "border-rose-400",
    ring: "ring-rose-200",
    text: "text-rose-700",
    textStrong: "text-rose-800",
    stripe: "bg-rose-500",
    chip: "bg-rose-400/50 text-rose-900",
  },
  {
    id: "teal",
    label: "Teal",
    labelEs: "Teal",
    hex: "#14b8a6",
    softHex: "#f0fdfa",
    dot: "bg-teal-500",
    swatch: "bg-teal-400",
    bg: "bg-teal-50",
    bgStrong: "bg-teal-200",
    border: "border-teal-300",
    borderStrong: "border-teal-400",
    ring: "ring-teal-200",
    text: "text-teal-700",
    textStrong: "text-teal-800",
    stripe: "bg-teal-500",
    chip: "bg-teal-400/50 text-teal-900",
  },
  {
    id: "orange",
    label: "Orange",
    labelEs: "Naranja",
    hex: "#f97316",
    softHex: "#fff7ed",
    dot: "bg-orange-500",
    swatch: "bg-orange-400",
    bg: "bg-orange-50",
    bgStrong: "bg-orange-200",
    border: "border-orange-300",
    borderStrong: "border-orange-400",
    ring: "ring-orange-200",
    text: "text-orange-700",
    textStrong: "text-orange-800",
    stripe: "bg-orange-500",
    chip: "bg-orange-400/50 text-orange-900",
  },
  {
    id: "indigo",
    label: "Indigo",
    labelEs: "Índigo",
    hex: "#6366f1",
    softHex: "#eef2ff",
    dot: "bg-indigo-500",
    swatch: "bg-indigo-400",
    bg: "bg-indigo-50",
    bgStrong: "bg-indigo-200",
    border: "border-indigo-300",
    borderStrong: "border-indigo-400",
    ring: "ring-indigo-200",
    text: "text-indigo-700",
    textStrong: "text-indigo-800",
    stripe: "bg-indigo-500",
    chip: "bg-indigo-400/50 text-indigo-900",
  },
  {
    id: "slate",
    label: "Slate",
    labelEs: "Gris",
    hex: "#64748b",
    softHex: "#f8fafc",
    dot: "bg-slate-500",
    swatch: "bg-slate-400",
    bg: "bg-slate-50",
    bgStrong: "bg-slate-200",
    border: "border-slate-300",
    borderStrong: "border-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-700",
    textStrong: "text-slate-800",
    stripe: "bg-slate-500",
    chip: "bg-slate-400/50 text-slate-900",
  },
];

export const FAMILY_COLOR = {
  id: "family",
  label: "Family",
  labelEs: "Familia",
  hex: "#3b82f6",
  softHex: "#eff6ff",
  dot: "bg-[image:var(--family-gradient)]",
  swatch: "bg-indigo-400",
  bg: "bg-[image:var(--family-soft-gradient)]",
  bgStrong: "bg-indigo-200",
  border: "border-blue-200",
  borderStrong: "border-indigo-400",
  ring: "ring-blue-200",
  text: "text-slate-800",
  textStrong: "text-indigo-800",
  stripe: "bg-[image:var(--family-gradient-vertical)]",
  chip: "bg-indigo-400/50 text-indigo-900",
};

const COLOR_ALIASES = {
  all: "family",
  everyone: "family",
  yellow: "amber",
  purple: "violet",
  pink: "rose",
  dad: "blue",
  father: "blue",
  mom: "amber",
  mother: "amber",
  "dad-blue": "blue",
  "mom-yellow": "amber",
};

export function normalizeColorId(colorId, fallback = "blue") {
  const value = String(colorId || "").trim().toLowerCase();
  if (!value) return fallback;
  return COLOR_ALIASES[value] || value;
}

export function getAppColor(colorId, fallback = "blue") {
  const normalized = normalizeColorId(colorId, fallback);
  if (normalized === "family") return FAMILY_COLOR;
  return APP_COLORS.find((color) => color.id === normalized) || APP_COLORS.find((color) => color.id === normalizeColorId(fallback)) || APP_COLORS[0];
}

export function isValidAppColor(colorId) {
  const normalized = normalizeColorId(colorId);
  return normalized === "family" || APP_COLORS.some((color) => color.id === normalized);
}

export function getColorHex(colorId, fallback = "blue") {
  return getAppColor(colorId, fallback).hex;
}

export function getColorSoftHex(colorId, fallback = "blue") {
  return getAppColor(colorId, fallback).softHex;
}

export function getColorClasses(colorId, fallback = "blue") {
  const color = getAppColor(colorId, fallback);
  return {
    dot: color.dot,
    swatch: color.swatch,
    bg: color.bg,
    bgStrong: color.bgStrong,
    border: color.border,
    borderStrong: color.borderStrong,
    ring: color.ring,
    text: color.text,
    textStrong: color.textStrong,
    stripe: color.stripe,
    chip: color.chip,
  };
}

export function getColorLabel(colorId, language = "en") {
  const color = getAppColor(colorId);
  return language === "es" ? color.labelEs || color.label : color.label;
}
