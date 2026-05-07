import React from "react";

import FamilyCalendarHeader from "@/components/calendar/FamilyCalendarHeader";

const days = ["Mon 4", "Tue 5", "Wed 6", "Thu 7", "Fri 8", "Sat 9", "Sun 10"];

export default function FamilyCalendarHeaderPreview() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="relative mx-auto max-w-[1600px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <FamilyCalendarHeader />

        <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
          {days.map((day) => (
            <div key={day} className="border-r border-slate-200 py-4 text-center last:border-r-0">
              <p className="text-base font-extrabold text-slate-900">{day}</p>
              <p className="text-xs font-semibold text-slate-500">May</p>
            </div>
          ))}
        </div>

        <div className="grid min-h-[420px] grid-cols-7 bg-white">
          {days.map((day, index) => (
            <div key={day} className="border-r border-slate-100 p-3 last:border-r-0">
              {index === 1 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">Baseball practice</div>}
              {index === 3 && <div className="rounded-xl border border-pink-200 bg-pink-50 p-3 text-xs font-bold text-pink-900">School event</div>}
            </div>
          ))}
        </div>

        <button className="absolute bottom-6 left-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-4xl font-light leading-none text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700 active:scale-95" aria-label="Add event">
          +
        </button>
      </div>
    </div>
  );
}
