import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import {
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Plus,
  ReceiptText,
  Repeat,
  Scale,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { currency, getBudgetSummary, initialCustodyExpenses } from "@/data/custodyBudget";

function statusMeta(status) {
  if (status === "settled") {
    return {
      label: "Settled",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "pending") {
    return {
      label: "Pending",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Review",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function normalizeExpenseDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    title: data.title || "Expense",
    category: data.category || "General",
    amount: Number(data.amount || 0),
    paidBy: data.paidBy || "Shared",
    split: data.split || "50/50",
    status: data.status || "review",
    due: data.due || "",
    recurring: Boolean(data.recurring),
    order: data.order ?? 999,
  };
}

function BudgetHero({ total, pending, settled, loading }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.28),transparent_34%),linear-gradient(135deg,#ffffff_0%,#fff7ed_46%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Budget PRO
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Shared child expenses, without the awkward tracking
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Keep daycare, activities, medical costs, receipts, and reimbursements clear between connected homes.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              This month
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">{loading ? "..." : currency(total)}</p>
            <div className="mt-3 flex gap-2">
              <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                {loading ? "Loading" : `${currency(pending)} pending`}
              </Badge>
              <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {loading ? "Loading" : `${currency(settled)} settled`}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, tone = "blue" }) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    emerald: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function ExpenseRow({ expense, onCycle }) {
  const meta = statusMeta(expense.status);

  return (
    <button
      type="button"
      onClick={() => onCycle(expense.id)}
      className="w-full rounded-[1.5rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
            {expense.recurring ? <Repeat className="h-6 w-6" /> : <ReceiptText className="h-6 w-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-black text-slate-950">{expense.title}</p>
              {expense.recurring && (
                <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
                  Recurring
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {expense.category} · Paid by {expense.paidBy} · Split {expense.split}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 md:justify-end">
          <div className="text-left md:text-right">
            <p className="text-xl font-black text-slate-950">{currency(expense.amount)}</p>
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{expense.due}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>
            {meta.label}
          </span>
        </div>
      </div>
    </button>
  );
}

function SplitPreview({ dadName, momName, pending }) {
  const estimatedShare = Math.round((pending || 0) / 2);

  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Reimbursement preview
        </p>
        <h3 className="mt-1 text-2xl font-black text-slate-950">
          Who owes what
        </h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          V1 estimate based on pending expenses with a 50/50 default split.
        </p>
      </div>

      <div className="space-y-3">
        <div className="rounded-[1.4rem] border border-blue-100 bg-blue-50/80 p-4">
          <p className="text-sm font-black text-blue-900">{dadName || "Dad"}</p>
          <p className="mt-1 text-3xl font-black text-blue-700">{currency(estimatedShare)}</p>
          <p className="mt-1 text-xs font-bold text-blue-700/80">Estimated balance</p>
        </div>
        <div className="rounded-[1.4rem] border border-amber-100 bg-amber-50/80 p-4">
          <p className="text-sm font-black text-amber-900">{momName || "Mom"}</p>
          <p className="mt-1 text-3xl font-black text-amber-700">{currency(estimatedShare)}</p>
          <p className="mt-1 text-xs font-bold text-amber-700/80">Estimated balance</p>
        </div>
      </div>
    </Card>
  );
}

export default function BudgetHub() {
  const { user, familyId, dadName, momName } = useFamily();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadExpenses() {
      if (!user || !familyId) {
        setExpenses([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const q = query(collection(db, "custodyExpenses"), where("familyId", "==", familyId));
        const snap = await getDocs(q);

        if (snap.empty) {
          const createdExpenses = await Promise.all(
            initialCustodyExpenses.map(async (expense, index) => {
              const docRef = await addDoc(collection(db, "custodyExpenses"), {
                ...expense,
                familyId,
                createdBy: user.uid,
                order: index,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              return { ...expense, id: docRef.id, order: index };
            })
          );

          if (!cancelled) setExpenses(createdExpenses);
          return;
        }

        const data = snap.docs
          .map(normalizeExpenseDoc)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

        if (!cancelled) setExpenses(data);
      } catch (error) {
        console.error("Error loading custody expenses:", error);
        if (!cancelled) setExpenses(initialCustodyExpenses);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExpenses();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, familyId]);

  const summary = useMemo(() => getBudgetSummary(expenses), [expenses]);

  const cycleStatus = async (id) => {
    const next = {
      review: "pending",
      pending: "settled",
      settled: "review",
    };

    const currentExpense = expenses.find((expense) => expense.id === id);
    if (!currentExpense) return;

    const nextStatus = next[currentExpense.status] || "review";

    setExpenses((current) =>
      current.map((expense) =>
        expense.id === id ? { ...expense, status: nextStatus } : expense
      )
    );

    try {
      await updateDoc(doc(db, "custodyExpenses", id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating custody expense:", error);
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === id ? { ...expense, status: currentExpense.status } : expense
        )
      );
    }
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BudgetHero loading={loading} total={summary.total} pending={summary.pending} settled={summary.settled} />

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard icon={WalletCards} label="Monthly total" value={currency(summary.total)} helper={`${summary.totalCount} tracked expenses`} tone="amber" />
          <SummaryCard icon={Scale} label="Default split" value="50/50" helper="Custom split supported later" tone="blue" />
          <SummaryCard icon={CheckCircle2} label="Settled" value={currency(summary.settled)} helper={`${summary.settledCount} settled item(s)`} tone="emerald" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Shared expenses
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Child-related costs
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Tap an expense to cycle between review, pending, and settled.
                </p>
              </div>

              <Button type="button" className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((expense) => (
                <ExpenseRow key={expense.id} expense={expense} onCycle={cycleStatus} />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <SplitPreview dadName={dadName} momName={momName} pending={summary.pending} />

            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Receipts
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    Attach proof later
                  </h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Next backend step: attach receipt images, notes, settlement status, and reimbursement history.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-6">
              <div className="flex items-start gap-4">
                <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-black text-emerald-900">
                    Low-conflict money tracking
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    Budget PRO should make expenses clear without turning the app into a conflict tool.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
