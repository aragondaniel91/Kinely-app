import React from "react";

const people = ["All", "Everyone", "Daniel Aragon", "Mary", "Joaquin", "Mady", "Sra Petra"];

export default function FamilyCalendarHeader() {
  return (
    <div className="border-b border-slate-200 bg-white px-6 py-5">
      <div className="grid grid-cols-[minmax(300px,1fr)_auto] gap-x-8 gap-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-sm">✦</div>
          <div>
            <p className="text-xl font-black leading-tight text-slate-950">Family Wall</p>
            <p className="text-xs font-semibold text-slate-400">Family Calendar</p>
          </div>
        </div>

        <div className="justify-self-end text-right">
          <div className="flex items-start gap-5">
            <div>
              <p className="text-xl font-black leading-tight text-slate-950">4:31 PM</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Thu, May 7</p>
            </div>
            <div>
              <p className="text-xl font-black leading-tight text-slate-950">76°</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Partly cloudy</p>
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <button className="rounded-xl px-1 text-2xl font-black text-slate-950 hover:bg-slate-50">May 2026</button>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Sync calendar</button>
          <button className="h-10 min-w-[160px] rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Person <span className="text-xs font-semibold text-slate-400">All</span></button>
          <button className="h-10 min-w-[180px] rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50">Category <span className="text-xs font-semibold text-slate-400">All Categories</span></button>
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-2">
          {people.map((person, index) => (
            <button key={person} className={index === 0 ? "rounded-full border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm" : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"}>{person}</button>
          ))}
        </div>

        <div className="self-center text-sm font-extrabold text-slate-600">18 events | May 4 - May 10</div>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <div className="flex items-center gap-2">
            <button className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 shadow-sm hover:bg-slate-50">‹</button>
            <button className="h-10 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">Today</button>
            <button className="h-10 w-10 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-600 shadow-sm hover:bg-slate-50">›</button>
          </div>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            <button className="h-10 min-w-[76px] border-r border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Day</button>
            <button className="h-10 min-w-[76px] border-r border-slate-200 bg-blue-600 px-4 text-sm font-bold text-white">Week</button>
            <button className="h-10 min-w-[76px] bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50">Month</button>
          </div>
        </div>
      </div>
    </div>
  );
}
