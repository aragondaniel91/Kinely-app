import React from "react";
import { cn } from "@/lib/utils";
import { APP_COLORS, getAppColor, normalizeColorId } from "@/lib/appColorUtils";

export const COLOR_MAP = Object.fromEntries(
  APP_COLORS.map((color) => [
    color.id,
    {
      bg: color.bgStrong,
      border: color.borderStrong,
      chip: color.chip,
      dot: color.dot,
      text: color.textStrong,
    },
  ])
);

export default function ParentColorPicker({ label, value, onChange, language = "es" }) {
  const selectedColorId = normalizeColorId(value || "blue");
  const selectedColor = getAppColor(selectedColorId);

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>

      <div className="flex flex-wrap gap-2">
        {APP_COLORS.map((color) => (
          <button
            key={color.id}
            type="button"
            onClick={() => onChange(color.id)}
            title={language === "es" ? color.labelEs || color.label : color.label}
            className={cn(
              "w-7 h-7 rounded-full border-2 transition-all",
              color.swatch,
              selectedColorId === color.id
                ? "border-foreground scale-110 shadow-md"
                : "border-transparent opacity-70 hover:opacity-100"
            )}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-1">
        {language === "es" ? "Seleccionado" : "Selected"}:{" "}
        <span className="font-semibold">
          {language === "es" ? selectedColor.labelEs || selectedColor.label : selectedColor.label}
        </span>
      </p>
    </div>
  );
}
