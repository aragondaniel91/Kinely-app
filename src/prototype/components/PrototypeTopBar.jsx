import React from "react";
import { ChevronDown, Moon, Sun, Users } from "lucide-react";

import KinlyLogo from "@/components/brand/KinlyLogo";

export default function PrototypeTopBar({
  familyName,
  dark,
  onToggleTheme,
  custodyEnabled,
  onToggleCustody,
}) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 md:px-5">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-[1.5rem] border border-white/70 bg-white/80 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-2xl dark:border-white/5 dark:bg-white/[0.05] dark:shadow-[0_12px_34px_rgba(0,0,0,0.5)] md:px-4">
        <div className="flex items-center gap-3">
          <KinlyLogo />
          <span className="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block" />
          {/* Family switcher placeholder */}
          <button
            type="button"
            className="hidden items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 sm:inline-flex"
          >
            <Users className="h-4 w-4 text-slate-400" />
            {familyName}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Custody preview toggle (prototype-only control) */}
          <button
            type="button"
            onClick={onToggleCustody}
            className={
              "hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition md:inline-flex " +
              (custodyEnabled
                ? "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20"
                : "bg-slate-50 text-slate-500 ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10")
            }
            title="Toggle custody preview"
          >
            <span
              className={
                "h-2 w-2 rounded-full " + (custodyEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-500")
              }
            />
            Custody {custodyEnabled ? "on" : "off"}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle light and dark mode"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-600 transition hover:bg-slate-100 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#6FA6F7] to-[#5B8DEF] text-sm font-bold text-white shadow-sm">
            DA
          </span>
        </div>
      </div>
    </header>
  );
}
