import React from "react";
import { Heart, Plus, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function FamilyHeader({ canWrite, onAddTask }) {
  return (
    <Card className="rounded-[2.25rem] border-white/80 bg-white/78 p-5 shadow-[0_24px_70px_rgba(38,50,56,0.08)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-emerald-800 text-white shadow-lg shadow-emerald-900/15">
            <Heart className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Kinly Family Tasks
            </p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Buenos días, familia
              <span className="ml-2 text-orange-300">♥</span>
            </h1>
            <p className="mt-1 text-sm font-extrabold text-slate-500">
              Pequeñas acciones, grandes recuerdos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <div className="rounded-2xl bg-white/80 px-4 py-3 text-right shadow-inner">
            <p className="text-2xl font-black leading-none text-slate-950">8:30 AM</p>
            <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Sábado · 24 mayo
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-700">
            <Sun className="h-7 w-7" />
            <div>
              <p className="text-xl font-black leading-none">22°C</p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider">
                Calm day
              </p>
            </div>
          </div>

          {canWrite && (
            <Button
              onClick={onAddTask}
              className="h-12 rounded-2xl bg-emerald-800 px-5 font-black text-white shadow-lg shadow-emerald-900/15 hover:bg-emerald-900"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add task
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
