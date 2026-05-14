import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export default function FamilyCalendarFilterDropdown({
  icon: Icon,
  label,
  value,
  options = [],
  onChange,
  align = "right",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(nextValue) {
    onChange?.(nextValue);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 min-w-[220px] items-center gap-3 rounded-2xl border bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/30",
          open ? "border-blue-300 ring-4 ring-blue-100" : "border-slate-200"
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0 text-slate-400" />}
        <span className="shrink-0 text-slate-800">{label}</span>
        <span className="min-w-0 flex-1 truncate text-left text-xs font-black text-slate-400">
          {selectedOption?.label || "All"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-300 transition",
            open ? "rotate-180 text-blue-500" : ""
          )}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute top-full z-[95] mt-2 w-[260px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15",
            align === "left" ? "left-0" : "right-0"
          )}
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-black text-slate-950">{label}</p>
            <p className="text-xs font-semibold text-slate-400">Choose what to show</p>
          </div>

          <div role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-2">
            {options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition",
                    active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {option.colorClass ? (
                    <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full", option.colorClass)} />
                  ) : option.icon ? (
                    <span className="shrink-0 text-base">{option.icon}</span>
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-slate-300" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-black">{option.label}</span>
                  {active && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
