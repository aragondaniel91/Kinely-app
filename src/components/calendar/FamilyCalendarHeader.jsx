import React from "react";

export default function FamilyCalendarHeader() {
  return (
    <div className="border-b border-slate-200 bg-white px-5 py-4">
      <div className="grid grid-cols-[minmax(260px,1fr)_auto] gap-x-6 gap-y-4">
        <div>
          <p className="text-xl font-black text-slate-950">Family Wall</p>
          <p className="text-xs font-semibold text-slate-400">Family Calendar</p>
        </div>
        <div className="justify-self-end">Weather / Time</div>
        <div className="text-2xl font-black text-slate-950">May 2026</div>
        <div className="flex justify-end gap-3">Person filter / Category filter</div>
        <div className="col-span-2">All names</div>
        <div className="font-extrabold text-slate-600">Resumen Events - Week</div>
        <div className="flex justify-end gap-4">&lt; Today &gt; Day | Week | Month</div>
      </div>
    </div>
  );
}
