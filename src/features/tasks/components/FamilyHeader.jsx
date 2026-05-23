import React, { useEffect, useMemo, useState } from "react";
import { CheckSquare, Clock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function getFormattedDateTime() {
  const now = new Date();

  return {
    time: now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
    date: now.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
  };
}

export default function FamilyHeader({ canWrite, onAddTask }) {
  const [dateTime, setDateTime] = useState(() => getFormattedDateTime());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDateTime(getFormattedDateTime());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  const subtitle = useMemo(() => "Today’s family rhythm", []);

  return (
    <Card className="rounded-[2.25rem] border-white/65 bg-white/58 p-5 shadow-[0_18px_44px_rgba(38,50,56,0.055)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] bg-primary text-primary-foreground shadow-lg shadow-primary/15">
            <CheckSquare className="h-7 w-7" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
              {subtitle}
            </p>

            <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              Family Tasks
            </h1>

            <p className="mt-1 text-sm font-extrabold text-slate-500">
              Everyone’s day at a glance.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <div className="flex items-center gap-3 rounded-2xl bg-white/55 px-4 py-3 shadow-inner">
            <Clock className="h-6 w-6 text-slate-400" />

            <div className="text-right">
              <p className="text-2xl font-black leading-none text-slate-950">
                {dateTime.time}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-wider text-slate-400">
                {dateTime.date}
              </p>
            </div>
          </div>

          {canWrite && (
            <Button
              onClick={onAddTask}
              className="h-12 rounded-2xl bg-primary px-5 font-black text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90"
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
