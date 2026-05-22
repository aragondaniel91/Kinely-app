import { BookOpen, CheckCircle2, Gift, Home, Moon, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getColorMeta, normalizeChildren } from "@/lib/personColorUtils";

const routineSections = [
  {
    id: "morning",
    label: "Morning",
    icon: Sun,
    items: ["Make bed", "Brush teeth", "Pack backpack"],
  },
  {
    id: "after-school",
    label: "After school",
    icon: BookOpen,
    items: ["Homework", "Clean toys", "Read 10 minutes"],
  },
  {
    id: "evening",
    label: "Evening",
    icon: Moon,
    items: ["Pajamas", "Prepare clothes", "Bedtime routine"],
  },
];

function ChildRoutineCard({ child, index }) {
  const color = getColorMeta(child.color);
  const reward = index % 2 === 0 ? "30 min screen time" : "Choose a treat";
  const completed = index % 2 === 0 ? 1 : 0;
  const total = 6;

  return (
    <Card className={`min-w-[280px] rounded-[2rem] border p-4 shadow-sm ${color.bg} ${color.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 text-lg font-black shadow-sm">
            {String(child.name || "C").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-950">{child.name || "Child"}</p>
            <p className="text-xs font-bold text-slate-500">
              {completed}/{total} complete today
            </p>
          </div>
        </div>

        <div className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black text-amber-700 shadow-sm">
          ⭐ {total * 2}
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {routineSections.slice(0, 2).map((section) => {
          const Icon = section.icon;

          return (
            <div key={section.id} className="rounded-2xl border border-white/70 bg-white/72 p-3 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color.text}`} />
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{section.label}</p>
              </div>

              <div className="space-y-2">
                {section.items.slice(0, 2).map((item, itemIndex) => {
                  const done = index === 0 && itemIndex === 0;

                  return (
                    <div key={item} className="flex items-center gap-2 rounded-xl bg-white/80 px-2.5 py-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${done ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-slate-200 bg-white text-slate-300"}`}>
                        {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </span>
                      <span className={`text-sm font-bold ${done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/85 p-3">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-600" />
          <p className="text-xs font-black uppercase tracking-wide text-amber-700">Reward</p>
        </div>
        <p className="mt-1 text-sm font-black text-slate-900">{reward}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Unlocks when today’s routine is complete.
        </p>
      </div>
    </Card>
  );
}

export default function KidsChoresPreview({ profile, canWrite = false, onAddTask }) {
  const children = normalizeChildren(profile?.children || []);

  return (
    <Card className="rounded-[2.25rem] border-white/80 bg-white/88 p-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
              Kids chores
            </span>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
            Routines that feel rewarding
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
            A future chore experience for morning routines, homework, toys, bedtime, and reward unlocks.
          </p>
        </div>

        {canWrite && (
          <Button type="button" variant="outline" onClick={onAddTask} className="h-11 rounded-2xl font-black">
            <Home className="mr-2 h-4 w-4" />
            Add chore
          </Button>
        )}
      </div>

      {children.length ? (
        <div className="family-scroll-x mt-5 flex gap-3 overflow-x-auto pb-2">
          {children.map((child, index) => (
            <ChildRoutineCard key={child.id || child.name || index} child={child} index={index} />
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center">
          <p className="text-sm font-black text-slate-800">No children added yet</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Add children in Profile to preview chore routines and rewards.
          </p>
        </div>
      )}
    </Card>
  );
}
