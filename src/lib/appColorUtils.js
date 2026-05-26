export const APP_COLORS = [
  {
    id: "blue",
    label: "Dusty Blue",
    labelEs: "Azul humo",
    hex: "#3A5F8A",
    softHex: "#F1F6FA",
    dot: "bg-blue-500",
    swatch: "bg-blue-400",
    bg: "bg-blue-50",
    bgStrong: "bg-blue-100",
    border: "border-blue-200",
    borderStrong: "border-blue-300",
    ring: "ring-blue-100",
    text: "text-blue-800",
    textStrong: "text-blue-900",
    stripe: "bg-blue-500",
    chip: "bg-blue-100 text-blue-900",
  },
  {
    id: "amber",
    label: "Ochre",
    labelEs: "Ocre",
    hex: "#B7791F",
    softHex: "#FBF6EA",
    dot: "bg-amber-500",
    swatch: "bg-amber-400",
    bg: "bg-amber-50",
    bgStrong: "bg-amber-100",
    border: "border-amber-200",
    borderStrong: "border-amber-300",
    ring: "ring-amber-100",
    text: "text-amber-800",
    textStrong: "text-amber-900",
    stripe: "bg-amber-500",
    chip: "bg-amber-100 text-amber-900",
  },
  {
    id: "green",
    label: "Sage",
    labelEs: "Salvia",
    hex: "#4F7D65",
    softHex: "#F1F7F3",
    dot: "bg-emerald-500",
    swatch: "bg-emerald-400",
    bg: "bg-emerald-50",
    bgStrong: "bg-emerald-100",
    border: "border-emerald-200",
    borderStrong: "border-emerald-300",
    ring: "ring-emerald-100",
    text: "text-emerald-800",
    textStrong: "text-emerald-900",
    stripe: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "violet",
    label: "Muted Plum",
    labelEs: "Ciruela",
    hex: "#6D5A8D",
    softHex: "#F5F2F8",
    dot: "bg-violet-500",
    swatch: "bg-violet-400",
    bg: "bg-violet-50",
    bgStrong: "bg-violet-100",
    border: "border-violet-200",
    borderStrong: "border-violet-300",
    ring: "ring-violet-100",
    text: "text-violet-800",
    textStrong: "text-violet-900",
    stripe: "bg-violet-500",
    chip: "bg-violet-100 text-violet-900",
  },
  {
    id: "rose",
    label: "Rosewood",
    labelEs: "Rosa madera",
    hex: "#A85C68",
    softHex: "#FAF1F3",
    dot: "bg-rose-500",
    swatch: "bg-rose-400",
    bg: "bg-rose-50",
    bgStrong: "bg-rose-100",
    border: "border-rose-200",
    borderStrong: "border-rose-300",
    ring: "ring-rose-100",
    text: "text-rose-800",
    textStrong: "text-rose-900",
    stripe: "bg-rose-500",
    chip: "bg-rose-100 text-rose-900",
  },
  {
    id: "teal",
    label: "Smoky Teal",
    labelEs: "Teal suave",
    hex: "#3F7C7A",
    softHex: "#F0F7F7",
    dot: "bg-teal-500",
    swatch: "bg-teal-400",
    bg: "bg-teal-50",
    bgStrong: "bg-teal-100",
    border: "border-teal-200",
    borderStrong: "border-teal-300",
    ring: "ring-teal-100",
    text: "text-teal-800",
    textStrong: "text-teal-900",
    stripe: "bg-teal-500",
    chip: "bg-teal-100 text-teal-900",
  },
  {
    id: "orange",
    label: "Clay",
    labelEs: "Arcilla",
    hex: "#B86B3E",
    softHex: "#FBF2EC",
    dot: "bg-orange-500",
    swatch: "bg-orange-400",
    bg: "bg-orange-50",
    bgStrong: "bg-orange-100",
    border: "border-orange-200",
    borderStrong: "border-orange-300",
    ring: "ring-orange-100",
    text: "text-orange-800",
    textStrong: "text-orange-900",
    stripe: "bg-orange-500",
    chip: "bg-orange-100 text-orange-900",
  },
  {
    id: "indigo",
    label: "Slate Indigo",
    labelEs: "Índigo sobrio",
    hex: "#4F5D8C",
    softHex: "#F1F3FA",
    dot: "bg-indigo-500",
    swatch: "bg-indigo-400",
    bg: "bg-indigo-50",
    bgStrong: "bg-indigo-100",
    border: "border-indigo-200",
    borderStrong: "border-indigo-300",
    ring: "ring-indigo-100",
    text: "text-indigo-800",
    textStrong: "text-indigo-900",
    stripe: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-900",
  },
  {
    id: "slate",
    label: "Stone",
    labelEs: "Piedra",
    hex: "#64748B",
    softHex: "#F8FAFC",
    dot: "bg-slate-500",
    swatch: "bg-slate-400",
    bg: "bg-slate-50",
    bgStrong: "bg-slate-100",
    border: "border-slate-200",
    borderStrong: "border-slate-300",
    ring: "ring-slate-100",
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
  hex: "#4F5D8C",
  softHex: "#F6F4EF",
  dot: "bg-[image:var(--family-gradient)]",
  swatch: "bg-slate-400",
  bg: "bg-[image:var(--family-soft-gradient)]",
  bgStrong: "bg-slate-100",
  border: "border-slate-200",
  borderStrong: "border-slate-300",
  ring: "ring-slate-100",
  text: "text-slate-800",
  textStrong: "text-slate-950",
  stripe: "bg-[image:var(--family-gradient-vertical)]",
  chip: "bg-slate-100 text-slate-900",
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
