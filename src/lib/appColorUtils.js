export const APP_COLORS = [
  {
    id: "blue",
    label: "Blue",
    labelEs: "Azul",
    hex: "#2563EB",
    softHex: "#EAF2FF",
    dot: "bg-blue-600",
    swatch: "bg-blue-500",
    bg: "bg-blue-50",
    bgStrong: "bg-blue-100",
    border: "border-blue-200",
    borderStrong: "border-blue-400",
    ring: "ring-blue-200",
    text: "text-blue-700",
    textStrong: "text-blue-900",
    stripe: "bg-blue-600",
    chip: "bg-blue-100 text-blue-900",
  },
  {
    id: "amber",
    label: "Honey",
    labelEs: "Miel",
    hex: "#D97706",
    softHex: "#FFF4D6",
    dot: "bg-amber-500",
    swatch: "bg-amber-400",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-100",
    border: "border-amber-200",
    borderStrong: "border-amber-400",
    ring: "ring-amber-200",
    text: "text-amber-700",
    textStrong: "text-amber-900",
    stripe: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
  },
  {
    id: "green",
    label: "Green",
    labelEs: "Verde",
    hex: "#059669",
    softHex: "#E8F8F1",
    dot: "bg-emerald-600",
    swatch: "bg-emerald-500",
    bg: "bg-emerald-50",
    bgStrong: "bg-emerald-100",
    border: "border-emerald-200",
    borderStrong: "border-emerald-400",
    ring: "ring-emerald-200",
    text: "text-emerald-700",
    textStrong: "text-emerald-900",
    stripe: "bg-emerald-600",
    chip: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "violet",
    label: "Purple",
    labelEs: "Morado",
    hex: "#7C3AED",
    softHex: "#F3EEFF",
    dot: "bg-violet-600",
    swatch: "bg-violet-500",
    bg: "bg-violet-50",
    bgStrong: "bg-violet-100",
    border: "border-violet-200",
    borderStrong: "border-violet-400",
    ring: "ring-violet-200",
    text: "text-violet-700",
    textStrong: "text-violet-900",
    stripe: "bg-violet-600",
    chip: "bg-violet-100 text-violet-900",
  },
  {
    id: "rose",
    label: "Pink",
    labelEs: "Rosa",
    hex: "#E11D48",
    softHex: "#FFE8EE",
    dot: "bg-rose-600",
    swatch: "bg-rose-500",
    bg: "bg-rose-50",
    bgStrong: "bg-rose-100",
    border: "border-rose-200",
    borderStrong: "border-rose-400",
    ring: "ring-rose-200",
    text: "text-rose-700",
    textStrong: "text-rose-900",
    stripe: "bg-rose-600",
    chip: "bg-rose-100 text-rose-900",
  },
  {
    id: "teal",
    label: "Teal",
    labelEs: "Teal",
    hex: "#0D9488",
    softHex: "#E6F7F5",
    dot: "bg-teal-600",
    swatch: "bg-teal-500",
    bg: "bg-teal-50",
    bgStrong: "bg-teal-100",
    border: "border-teal-200",
    borderStrong: "border-teal-400",
    ring: "ring-teal-200",
    text: "text-teal-700",
    textStrong: "text-teal-900",
    stripe: "bg-teal-600",
    chip: "bg-teal-100 text-teal-900",
  },
  {
    id: "orange",
    label: "Orange",
    labelEs: "Naranja",
    hex: "#EA580C",
    softHex: "#FFF0E6",
    dot: "bg-orange-600",
    swatch: "bg-orange-500",
    bg: "bg-orange-50",
    bgStrong: "bg-orange-100",
    border: "border-orange-200",
    borderStrong: "border-orange-400",
    ring: "ring-orange-200",
    text: "text-orange-700",
    textStrong: "text-orange-900",
    stripe: "bg-orange-600",
    chip: "bg-orange-100 text-orange-900",
  },
  {
    id: "indigo",
    label: "Indigo",
    labelEs: "Índigo",
    hex: "#4F46E5",
    softHex: "#EEF2FF",
    dot: "bg-indigo-600",
    swatch: "bg-indigo-500",
    bg: "bg-indigo-50",
    bgStrong: "bg-indigo-100",
    border: "border-indigo-200",
    borderStrong: "border-indigo-400",
    ring: "ring-indigo-200",
    text: "text-indigo-700",
    textStrong: "text-indigo-900",
    stripe: "bg-indigo-600",
    chip: "bg-indigo-100 text-indigo-900",
  },
  {
    id: "slate",
    label: "Slate",
    labelEs: "Gris",
    hex: "#64748B",
    softHex: "#F1F5F9",
    dot: "bg-slate-500",
    swatch: "bg-slate-400",
    bg: "bg-slate-50",
    bgStrong: "bg-slate-100",
    border: "border-slate-200",
    borderStrong: "border-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-700",
    textStrong: "text-slate-900",
    stripe: "bg-slate-500",
    chip: "bg-slate-100 text-slate-900",
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
