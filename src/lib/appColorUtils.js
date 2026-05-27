export const APP_COLORS = [
  {
    id: "blue",
    label: "Ocean",
    labelEs: "Océano",
    hex: "#006B9E",
    softHex: "#EAF4FB",
    dot: "bg-sky-700",
    swatch: "bg-sky-600",
    bg: "bg-sky-50",
    bgStrong: "bg-sky-100",
    border: "border-sky-200",
    borderStrong: "border-sky-400",
    ring: "ring-sky-200",
    text: "text-sky-800",
    textStrong: "text-sky-950",
    stripe: "bg-sky-700",
    chip: "bg-sky-100 text-sky-900",
  },
  {
    id: "amber",
    label: "Ochre",
    labelEs: "Ocre",
    hex: "#B7791F",
    softHex: "#FFF7E6",
    dot: "bg-amber-700",
    swatch: "bg-amber-600",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-100",
    border: "border-amber-200",
    borderStrong: "border-amber-400",
    ring: "ring-amber-200",
    text: "text-amber-800",
    textStrong: "text-amber-950",
    stripe: "bg-amber-700",
    chip: "bg-amber-100 text-amber-900",
  },
  {
    id: "green",
    label: "Emerald",
    labelEs: "Esmeralda",
    hex: "#007A55",
    softHex: "#E6F6EF",
    dot: "bg-emerald-700",
    swatch: "bg-emerald-600",
    bg: "bg-emerald-50",
    bgStrong: "bg-emerald-100",
    border: "border-emerald-200",
    borderStrong: "border-emerald-400",
    ring: "ring-emerald-200",
    text: "text-emerald-800",
    textStrong: "text-emerald-950",
    stripe: "bg-emerald-700",
    chip: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "violet",
    label: "Plum",
    labelEs: "Ciruela",
    hex: "#7C3AED",
    softHex: "#F1ECFB",
    dot: "bg-violet-700",
    swatch: "bg-violet-600",
    bg: "bg-violet-50",
    bgStrong: "bg-violet-100",
    border: "border-violet-200",
    borderStrong: "border-violet-400",
    ring: "ring-violet-200",
    text: "text-violet-800",
    textStrong: "text-violet-950",
    stripe: "bg-violet-700",
    chip: "bg-violet-100 text-violet-900",
  },
  {
    id: "rose",
    label: "Rose",
    labelEs: "Rosa",
    hex: "#C92B55",
    softHex: "#FCE8EA",
    dot: "bg-rose-700",
    swatch: "bg-rose-600",
    bg: "bg-rose-50",
    bgStrong: "bg-rose-100",
    border: "border-rose-200",
    borderStrong: "border-rose-400",
    ring: "ring-rose-200",
    text: "text-rose-800",
    textStrong: "text-rose-950",
    stripe: "bg-rose-700",
    chip: "bg-rose-100 text-rose-900",
  },
  {
    id: "teal",
    label: "Teal",
    labelEs: "Teal",
    hex: "#087C7A",
    softHex: "#E6F5F4",
    dot: "bg-teal-700",
    swatch: "bg-teal-600",
    bg: "bg-teal-50",
    bgStrong: "bg-teal-100",
    border: "border-teal-200",
    borderStrong: "border-teal-400",
    ring: "ring-teal-200",
    text: "text-teal-800",
    textStrong: "text-teal-950",
    stripe: "bg-teal-700",
    chip: "bg-teal-100 text-teal-900",
  },
  {
    id: "orange",
    label: "Clay",
    labelEs: "Arcilla",
    hex: "#B45309",
    softHex: "#FFF1E6",
    dot: "bg-orange-700",
    swatch: "bg-orange-600",
    bg: "bg-orange-50",
    bgStrong: "bg-orange-100",
    border: "border-orange-200",
    borderStrong: "border-orange-400",
    ring: "ring-orange-200",
    text: "text-orange-800",
    textStrong: "text-orange-950",
    stripe: "bg-orange-700",
    chip: "bg-orange-100 text-orange-900",
  },
  {
    id: "indigo",
    label: "Indigo",
    labelEs: "Índigo",
    hex: "#4F46E5",
    softHex: "#EEF2FF",
    dot: "bg-indigo-700",
    swatch: "bg-indigo-600",
    bg: "bg-indigo-50",
    bgStrong: "bg-indigo-100",
    border: "border-indigo-200",
    borderStrong: "border-indigo-400",
    ring: "ring-indigo-200",
    text: "text-indigo-800",
    textStrong: "text-indigo-950",
    stripe: "bg-indigo-700",
    chip: "bg-indigo-100 text-indigo-900",
  },
  {
    id: "slate",
    label: "Slate",
    labelEs: "Pizarra",
    hex: "#475569",
    softHex: "#F1F5F9",
    dot: "bg-slate-600",
    swatch: "bg-slate-500",
    bg: "bg-slate-50",
    bgStrong: "bg-slate-100",
    border: "border-slate-200",
    borderStrong: "border-slate-400",
    ring: "ring-slate-200",
    text: "text-slate-700",
    textStrong: "text-slate-950",
    stripe: "bg-slate-600",
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
