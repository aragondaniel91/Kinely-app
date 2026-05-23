import React from "react";

import { cn } from "@/lib/utils";
import { TASK_CATEGORY_OPTIONS } from "@/features/tasks/utils/taskDialogOptions";

export default function TaskCategoryFilter({ activeCategory, onChange }) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/78 p-3 shadow-[0_14px_38px_rgba(38,50,56,0.06)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Filter
        </span>

        {TASK_CATEGORY_OPTIONS.map((category) => {
          const isActive = activeCategory === category.value;

          return (
            <button
              key={category.value}
              type="button"
              onClick={() => onChange(category.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-black transition",
                isActive
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/15"
                  : "bg-secondary/70 text-slate-500 hover:bg-white hover:text-slate-800"
              )}
            >
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
