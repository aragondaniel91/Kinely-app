import React from "react";
import { Link } from "react-router-dom";
import { BellRing, ChevronRight, CreditCard, Heart, Shirt, Sparkles, User } from "lucide-react";

import { Card } from "@/components/ui/card";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function SmartCard({ icon: Icon, title, text, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    violet: "bg-violet-50 text-violet-700 border-violet-100",
  };

  return (
    <Card className="rounded-[1.7rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${tones[tone]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-black text-slate-950">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{text}</p>
        </div>
      </div>
    </Card>
  );
}

export default function HomeProDashboard({
  todayLabel,
  nextChange,
  nextChangeLabel,
  isWithDad,
}) {
  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.16),transparent_34%),linear-gradient(180deg,#F8F7F4_0%,#FFFFFF_55%,#F8FAFC_100%)] px-4 py-5 md:px-6 md:py-7">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
          <div className="bg-[radial-gradient(circle_at_top_left,rgba(123,201,161,0.20),transparent_34%),linear-gradient(135deg,#ffffff_0%,#eff6ff_48%,#f8f7f4_100%)] p-6 md:p-8">
            <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  Kinly Family Brief
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
                  {getGreeting()}, familia
                </h1>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
                  Aquí está lo importante de hoy para mantener a tu familia coordinada, tranquila y conectada.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.4rem] border border-white/80 bg-white/78 p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Hoy</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{todayLabel}</p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/80 bg-white/78 p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Exchange</p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {nextChange ? `${nextChange.days} día${nextChange.days === 1 ? "" : "s"}` : "Sin cambio"}
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] border border-white/80 bg-white/78 p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Readiness</p>
                    <p className="mt-1 text-lg font-black text-slate-950">80% ready</p>
                  </div>
                </div>
              </div>

              <Link to="/custody" className="block lg:min-w-[300px]">
                <div className="rounded-[1.8rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Custody focus
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-blue-50 text-blue-700">
                      {isWithDad ? <User className="h-8 w-8" /> : <Heart className="h-8 w-8" />}
                    </div>
                    <div>
                      <p className="text-xl font-black text-slate-950">{todayLabel}</p>
                      <p className="mt-1 text-sm font-bold text-slate-500">
                        {nextChange ? `Próximo cambio con ${nextChangeLabel}` : "No exchange scheduled"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-black text-blue-700">
                    Open custody suite <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SmartCard icon={Shirt} title="Packing" text="Transition checklist is 80% ready." tone="emerald" />
          <SmartCard icon={CreditCard} title="Budget" text="1 reimbursement needs attention." tone="amber" />
          <SmartCard icon={BellRing} title="Smart reminder" text="Medicine and exchange reminders are ready." tone="violet" />
          <SmartCard icon={Sparkles} title="Family insight" text="Your day looks organized. Nothing urgent right now." tone="blue" />
        </div>
      </div>
    </div>
  );
}
