import React from "react";
import { ChevronLeft, ChevronRight, RefreshCw, Tags, User } from "lucide-react";

const people = [
  { name: "Daniel Aragon", color: "bg-blue-500" },
  { name: "Amanda Arraga", color: "bg-yellow-500" },
  { name: "Joaquin", color: "bg-emerald-500" },
  { name: "Everyone", color: "bg-lime-600" },
];

export default function FamilyCalendarHeader() {
  return (
    <div className="border-b border-slate-100 bg-white px-10 pb-2 pt-7">
      <div className="grid grid-cols-[1fr_auto] items-start gap-x-10 gap-y-3">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="text-xl leading-none">🏠</span>
          <div>
            <p className="text-lg font-black leading-tight text-slate-900">Family Wall</p>
            <button className="flex items-center gap-1 rounded-lg px-1 py-0.5 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-700">
              Aragon Arraga Family
              <span className="text-slate-400">⌄</span>
            </button>
          </div>
        </div>

        <div className="flex items-start justify-end gap-8 text-right">
          <div>
            <p className="text-xl font-black leading-tight text-slate-950">5:39 p.m.</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Jue 7 de May</p>
          </div>
          <div>
            <p className="text-xl font-black leading-tight text-slate-950">☁️ 76°</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Cloudy</p>
          </div>
        </div>

        <h1 className="text-[42px] font-black leading-none tracking-tight text-slate-950">
          Family Calendar
        </h1>

        <div className="flex justify-end">
          <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
            <RefreshCw className="h-4 w-4 text-slate-500" />
            <span>Sync calendar</span>
          </button>
        </div>

        <button className="flex w-fit items-center mt-2 gap-2 rounded-xl px-1 text-2xl font-bold text-slate-800 hover:bg-slate-50">
          <span className="text-xl leading-none">🗓️</span>
          May 2026
          <span className="text-base text-slate-400">⌄</span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-4">
          <button className="flex h-11 min-w-[220px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <User className="h-4 w-4 text-slate-500" />
            Person
            <span className="text-xs font-semibold text-slate-400">All People</span>
            <span className="ml-auto text-slate-400">⌄</span>
          </button>
          <button className="flex h-11 min-w-[230px] items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 text-left text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
            <Tags className="h-4 w-4 text-slate-500" />
            Category
            <span className="text-xs font-semibold text-slate-400">All Categories</span>
            <span className="ml-auto text-slate-400">⌄</span>
          </button>
        </div>

        <div className="col-span-2 flex mt-2 flex-wrap items-center gap-12 pt-1">
          {people.map((person) => (
            <div key={person.name} className="flex items-center gap-3">
              <span className={`h-4 w-4 rounded-full ${person.color}`} />
              <span className="text-base font-semibold text-slate-800">{person.name}</span>
            </div>
          ))}
        </div>

        <div className="self-center mt-3 pb-1 text-base font-semibold text-slate-600">
          17 events · May 2026
        </div>

        <div className="flex flex-wrap items-center justify-end gap-5 pb-1">
          <div className="flex items-center gap-3">
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Today</button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-800">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="flex overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            {['Day', 'Week', 'Month'].map((view) => (
              <button
                key={view}
                className={
                  view === 'Month'
                    ? 'min-w-[86px] border-r border-slate-200 bg-blue-600 px-5 py-3 text-sm font-black text-white last:border-r-0'
                    : 'min-w-[86px] border-r border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 last:border-r-0'
                }
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
