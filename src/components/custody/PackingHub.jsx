import React, { useMemo, useState } from "react";
import {
  Backpack,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Heart,
  Pill,
  Plus,
  Shirt,
  Sparkles,
  Star,
  Trophy,
  XCircle,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  custodyPackingTemplates,
  getPackingSummary,
  initialCustodyPackingItems,
} from "@/data/custodyPacking";

const iconMap = {
  school: Backpack,
  weekend: Shirt,
  sports: Trophy,
  medicine: Pill,
};

const accentMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rose: "bg-rose-50 text-rose-700 border-rose-100",
};

function statusMeta(status) {
  if (status === "packed") {
    return {
      label: "Packed",
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "missing") {
    return {
      label: "Missing",
      icon: XCircle,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Review",
    icon: ClipboardList,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  };
}

function PackingHero({ readiness, packedCount, totalCount }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(123,201,161,0.24),transparent_34%),linear-gradient(135deg,#ffffff_0%,#ecfdf5_46%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-emerald-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Packing PRO
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Ready for the next transition
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Keep clothes, medicine, school items, and comfort objects organized before custody exchanges.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Packing readiness
            </p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.35rem] bg-emerald-50 text-2xl font-black text-emerald-700">
                {readiness}%
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {packedCount} of {totalCount} packed
                </p>
                <p className="text-sm font-bold text-slate-500">Next exchange checklist</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function TemplateCard({ template }) {
  const Icon = iconMap[template.id] || Backpack;
  const accent = accentMap[template.tone] || accentMap.blue;

  return (
    <button
      type="button"
      className="rounded-[1.6rem] border border-white/80 bg-white p-4 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,23,42,0.09)]"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-black text-slate-950">{template.label}</h3>
      <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{template.description}</p>
    </button>
  );
}

function PackingItem({ item, onCycle }) {
  const meta = statusMeta(item.status);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={() => onCycle(item.id)}
      className="flex w-full items-center gap-3 rounded-[1.4rem] border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
        {item.important ? <Star className="h-5 w-5 fill-amber-100 text-amber-600" /> : <Backpack className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-black text-slate-950">{item.name}</p>
          {item.important && (
            <Badge variant="secondary" className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
              Important
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs font-semibold text-slate-400">
          {item.category} · Responsible: {item.owner}
        </p>
      </div>

      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </span>
    </button>
  );
}

function PeaceOfMindCard() {
  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <Heart className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Calm transition
          </p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">
            Less forgetting. Less friction.
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            Packing is not just a checklist. It helps the child feel prepared, cared for, and comfortable between homes.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function PackingHub() {
  const [items, setItems] = useState(initialCustodyPackingItems);

  const summary = useMemo(() => getPackingSummary(items), [items]);

  const cycleStatus = (id) => {
    const next = {
      review: "packed",
      packed: "missing",
      missing: "review",
    };

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: next[item.status] } : item
      )
    );
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PackingHero readiness={summary.readiness} packedCount={summary.packedCount} totalCount={summary.totalCount} />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Packed</p>
            <p className="mt-1 text-3xl font-black text-emerald-700">{summary.packedCount}</p>
          </Card>
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Missing</p>
            <p className="mt-1 text-3xl font-black text-rose-700">{summary.missingCount}</p>
          </Card>
          <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Review</p>
            <p className="mt-1 text-3xl font-black text-amber-700">{summary.reviewCount}</p>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Exchange packing list
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  What needs to travel
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Tap an item to cycle between review, packed, and missing.
                </p>
              </div>

              <Button type="button" className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                Add item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <PackingItem key={item.id} item={item} onCycle={cycleStatus} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Smart templates
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Reusable lists
                  </h3>
                </div>
                <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
                  V1
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {custodyPackingTemplates.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </Card>

            <PeaceOfMindCard />
          </div>
        </div>
      </div>
    </div>
  );
}
