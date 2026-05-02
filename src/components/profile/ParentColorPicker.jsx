import React from "react";
import { cn } from "@/lib/utils";

const COLOR_OPTIONS = [
  {
    id: "blue",
    label: "Azul",
    swatch: "bg-blue-400",
    preview: "bg-blue-100 border-blue-300",
  },
  {
    id: "amber",
    label: "Amarillo",
    swatch: "bg-amber-400",
    preview: "bg-amber-100 border-amber-300",
  },
  {
    id: "green",
    label: "Verde",
    swatch: "bg-green-400",
    preview: "bg-green-100 border-green-300",
  },
  {
    id: "violet",
    label: "Violeta",
    swatch: "bg-violet-400",
    preview: "bg-violet-100 border-violet-300",
  },
  {
    id: "rose",
    label: "Rosa",
    swatch: "bg-rose-400",
    preview: "bg-rose-100 border-rose-300",
  },
  {
    id: "teal",
    label: "Teal",
    swatch: "bg-teal-400",
    preview: "bg-teal-100 border-teal-300",
  },
  {
    id: "orange",
    label: "Naranja",
    swatch: "bg-orange-400",
    preview: "bg-orange-100 border-orange-300",
  },
  {
    id: "indigo",
    label: "Índigo",
    swatch: "bg-indigo-400",
    preview: "bg-indigo-100 border-indigo-300",
  },
];

export const COLOR_MAP = {
  blue: {
    bg: "bg-blue-200",
    border: "border-blue-400",
    chip: "bg-blue-400/50 text-blue-900",
    dot: "bg-blue-500",
    text: "text-blue-800",
  },
  amber: {
    bg: "bg-amber-200",
    border: "border-amber-400",
    chip: "bg-amber-400/50 text-amber-900",
    dot: "bg-amber-500",
    text: "text-amber-800",
  },
  green: {
    bg: "bg-green-200",
    border: "border-green-400",
    chip: "bg-green-400/50 text-green-900",
    dot: "bg-green-500",
    text: "text-green-800",
  },
  violet: {
    bg: "bg-violet-200",
    border: "border-violet-400",
    chip: "bg-violet-400/50 text-violet-900",
    dot: "bg-violet-500",
    text: "text-violet-800",
  },
  rose: {
    bg: "bg-rose-200",
    border: "border-rose-400",
    chip: "bg-rose-400/50 text-rose-900",
    dot: "bg-rose-500",
    text: "text-rose-800",
  },
  teal: {
    bg: "bg-teal-200",
    border: "border-teal-400",
    chip: "bg-teal-400/50 text-teal-900",
    dot: "bg-teal-500",
    text: "text-teal-800",
  },
  orange: {
    bg: "bg-orange-200",
    border: "border-orange-400",
    chip: "bg-orange-400/50 text-orange-900",
    dot: "bg-orange-500",
    text: "text-orange-800",
  },
  indigo: {
    bg: "bg-indigo-200",
    border: "border-indigo-400",
    chip: "bg-indigo-400/50 text-indigo-900",
    dot: "bg-indigo-500",
    text: "text-indigo-800",
  },
};

export default function ParentColorPicker({ label, value, onChange }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>

      <div className="flex flex-wrap gap-2">
        {COLOR_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.label}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all",
              opt.swatch,
              value === opt.id
                ? "border-foreground scale-110 shadow-md"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        Seleccionado:{" "}
        <span className="font-semibold">
          {COLOR_OPTIONS.find((o) => o.id === value)?.label || "Azul"}
        </span>
      </p>
    </div>
  );
}
