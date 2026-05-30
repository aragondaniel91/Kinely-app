import React from "react";
import {
  CalendarDays,
  CheckSquare,
  HeartHandshake,
  Home,
  ListChecks,
  User,
  UtensilsCrossed,
} from "lucide-react";

export default function BottomNav({ custodyEnabled }) {
  const items = [
    { icon: Home, label: "Home", active: true },
    { icon: CalendarDays, label: "Calendar" },
    { icon: CheckSquare, label: "Tasks" },
    { icon: UtensilsCrossed, label: "Meals" },
    { icon: ListChecks, label: "Lists" },
    ...(custodyEnabled ? [{ icon: HeartHandshake, label: "Custody" }] : []),
    { icon: User, label: "Profile" },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="pointer-events-auto mx-auto max-w-2xl rounded-[1.85rem] border border-white/70 bg-white/80 p-1.5 shadow-[0_20px_52px_rgba(15,23,42,0.16)] backdrop-blur-2xl dark:border-white/10 dark:bg-[#16223a]/85 dark:shadow-[0_20px_52px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-around gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className={
                  "flex min-w-[54px] flex-col items-center gap-1 rounded-[1.35rem] px-2 py-2 text-[10.5px] font-bold transition " +
                  (item.active
                    ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-400/20"
                    : "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200")
                }
              >
                <Icon className={"h-5 w-5 " + (item.active ? "stroke-[2.6]" : "")} />
                <span className="leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
