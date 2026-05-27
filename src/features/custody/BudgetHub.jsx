import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Pencil,
  Plus,
  ReceiptText,
  Repeat,
  Scale,
  Trash2,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import {
  currency,
  getBudgetSummary,
  getExpenseLedger,
  initialCustodyExpenses,
  validateExpenseLedger,
} from "@/data/custodyBudget";

const emptyNewExpense = {
  title: "",
  category: "School",
  amount: "",
  splitType: "50/50",
  parent1ShareAmount: "",
  parent2ShareAmount: "",
  parent1PaidAmount: "",
  parent2PaidAmount: "",
  due: "",
  recurring: false,
};

function moneyInput(value) {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function toMoney(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100) / 100;
}

function expenseToForm(expense) {
  const ledger = getExpenseLedger(expense);

  return {
    title: expense?.title || "",
    category: expense?.category || "School",
    amount: moneyInput(ledger.amount),
    splitType: ledger.splitType || "50/50",
    parent1ShareAmount: moneyInput(ledger.parent1ShareAmount),
    parent2ShareAmount: moneyInput(ledger.parent2ShareAmount),
    parent1PaidAmount: moneyInput(ledger.parent1PaidAmount),
    parent2PaidAmount: moneyInput(ledger.parent2PaidAmount),
    due: expense?.due || "",
    recurring: Boolean(expense?.recurring),
  };
}

function normalizeExpenseDoc(docSnap) {
  const data = docSnap.data();
  const expense = {
    id: docSnap.id,
    title: data.title || "Expense",
    category: data.category || "General",
    amount: Number(data.amount || 0),
    splitType: data.splitType || data.split || "50/50",
    parent1ShareAmount: data.parent1ShareAmount,
    parent2ShareAmount: data.parent2ShareAmount,
    parent1PaidAmount: data.parent1PaidAmount,
    parent2PaidAmount: data.parent2PaidAmount,
    due: data.due || "",
    recurring: Boolean(data.recurring),
    payments: Array.isArray(data.payments) ? data.payments : [],
    reviewFlag: Boolean(data.reviewFlag),
    reviewNote: data.reviewNote || "",
    order: data.order ?? 999,

    // Legacy fields kept only so old Firestore docs still normalize correctly.
    paidBy: data.paidBy || "Shared",
    split: data.split || "50/50",
    status: data.status || "review",
  };

  return {
    ...expense,
    ledger: getExpenseLedger(expense),
  };
}

function statusMeta(status) {
  if (status === "paid") {
    return {
      label: "Paid",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "partial") {
    return {
      label: "Partial",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (status === "open") {
    return {
      label: "Open",
      className: "border-slate-200 bg-slate-50 text-slate-700",
    };
  }

  return {
    label: "Review",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  };
}

function applySplitDefaults(form, nextAmount = form.amount, nextSplitType = form.splitType) {
  const amount = toMoney(nextAmount);
  const splitType = nextSplitType || "50/50";

  if (!amount || amount <= 0) {
    return {
      ...form,
      amount: nextAmount,
      splitType,
    };
  }

  if (splitType === "50/50") {
    const parent1Share = Math.round((amount / 2) * 100) / 100;
    return {
      ...form,
      amount: String(nextAmount),
      splitType,
      parent1ShareAmount: String(parent1Share),
      parent2ShareAmount: String(Math.round((amount - parent1Share) * 100) / 100),
    };
  }

  if (splitType === "Parent 1 pays") {
    return {
      ...form,
      amount: String(nextAmount),
      splitType,
      parent1ShareAmount: String(amount),
      parent2ShareAmount: "0",
    };
  }

  if (splitType === "Parent 2 pays") {
    return {
      ...form,
      amount: String(nextAmount),
      splitType,
      parent1ShareAmount: "0",
      parent2ShareAmount: String(amount),
    };
  }

  return {
    ...form,
    amount: String(nextAmount),
    splitType,
  };
}

function BudgetHero({ total, paid, remaining, loading }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(255,209,102,0.28),transparent_34%),linear-gradient(135deg,#ffffff_0%,#fff7ed_46%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-amber-700 shadow-sm">
              <BadgeDollarSign className="h-3.5 w-3.5" />
              Budget Ledger
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Shared expenses with clear parent balances
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Track what each parent should pay, what each parent already paid, and what is still owed per expense.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Total expenses
            </p>
            <p className="mt-2 text-4xl font-black text-slate-950">{loading ? "..." : currency(total)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {loading ? "Loading" : `${currency(paid)} paid`}
              </Badge>
              <Badge className="rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50">
                {loading ? "Loading" : `${currency(remaining)} still owed`}
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
    rose: "bg-rose-50 text-rose-700",
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

function ParentLedgerPanel({
  activeParent,
  setActiveParent,
  parent1Name,
  parent2Name,
  parent1Color,
  parent2Color,
  summary,
}) {
  const selected =
    activeParent === "parent1"
      ? {
          id: "parent1",
          name: parent1Name,
          color: parent1Color,
          shouldPay: summary.parent1ShouldPay,
          paid: summary.parent1Paid,
          remaining: summary.parent1Remaining,
          overpaid: summary.parent1Overpaid,
        }
      : {
          id: "parent2",
          name: parent2Name,
          color: parent2Color,
          shouldPay: summary.parent2ShouldPay,
          paid: summary.parent2Paid,
          remaining: summary.parent2Remaining,
          overpaid: summary.parent2Overpaid,
        };

  const selectedClasses = getColorClasses(normalizeColorId(selected.color, "blue"), "blue");

  const options = [
    {
      id: "parent1",
      name: parent1Name,
      color: parent1Color,
      remaining: summary.parent1Remaining,
    },
    {
      id: "parent2",
      name: parent2Name,
      color: parent2Color,
      remaining: summary.parent2Remaining,
    },
  ];

  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          Parent ledger
        </p>
        <h3 className="mt-1 text-2xl font-black text-slate-950">
          Balance by parent
        </h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Tap a parent to focus the totals and expense breakdown.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        {options.map((option) => {
          const active = activeParent === option.id;
          const optionClasses = getColorClasses(normalizeColorId(option.color, "blue"), "blue");

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setActiveParent(option.id)}
              className={`rounded-2xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                active
                  ? `${optionClasses.border} ${optionClasses.bg} shadow-sm`
                  : "border-slate-200 bg-slate-50 hover:bg-white"
              }`}
            >
              <p className={`text-sm font-black ${active ? optionClasses.textStrong : "text-slate-700"}`}>
                {option.name}
              </p>
              <p className={`mt-1 text-xs font-bold ${active ? optionClasses.text : "text-slate-500"}`}>
                Owes {currency(option.remaining)}
              </p>
            </button>
          );
        })}
      </div>

      <div className={`rounded-[1.6rem] border p-4 ${selectedClasses.border} ${selectedClasses.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={`text-sm font-black ${selectedClasses.textStrong}`}>{selected.name}</p>
            <p className="mt-1 text-xs font-bold text-slate-500">Current focused balance</p>
          </div>
          <Badge className={`rounded-full bg-white/80 ${selectedClasses.textStrong} hover:bg-white/80`}>
            {selected.remaining > 0 ? "Owes" : "Clear"}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Should pay</p>
            <p className="mt-1 text-lg font-black text-slate-950">{currency(selected.shouldPay)}</p>
          </div>
          <div className="rounded-2xl bg-white/75 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Paid</p>
            <p className="mt-1 text-lg font-black text-slate-950">{currency(selected.paid)}</p>
          </div>
          <div className="rounded-2xl bg-white/85 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Still owes</p>
            <p className={`mt-1 text-xl font-black ${selected.remaining > 0 ? selectedClasses.text : "text-emerald-700"}`}>
              {currency(selected.remaining)}
            </p>
          </div>
        </div>

        {selected.overpaid > 0 && (
          <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs font-bold leading-5 text-blue-800">
            {selected.name} paid {currency(selected.overpaid)} more than their current share.
          </div>
        )}
      </div>
    </Card>
  );
}

function ExpenseBreakdownLine({ label, color, share, paid, remaining, overpaid }) {
  const classes = getColorClasses(normalizeColorId(color, "blue"), "blue");

  return (
    <div className={`rounded-2xl border p-3 ${classes.border} ${classes.bg}`}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className={`text-sm font-black ${classes.textStrong}`}>{label}</p>
        <Badge className={`rounded-full bg-white/75 ${classes.textStrong} hover:bg-white/75`}>
          owes {currency(remaining)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-600">
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-slate-400">Share</p>
          <p className="text-slate-950">{currency(share)}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-slate-400">Paid</p>
          <p className="text-slate-950">{currency(paid)}</p>
        </div>
        <div className="rounded-xl bg-white/70 p-2">
          <p className="text-slate-400">Remaining</p>
          <p className={remaining > 0 ? classes.textStrong : "text-emerald-700"}>
            {currency(remaining)}
          </p>
        </div>
      </div>

      {overpaid > 0 && (
        <p className="mt-2 text-xs font-bold text-blue-700">
          Overpaid by {currency(overpaid)}
        </p>
      )}
    </div>
  );
}

function ExpenseRow({
  expense,
  activeParent,
  parent1Name,
  parent2Name,
  parent1Color,
  parent2Color,
  onPayment,
  onEdit,
  onDelete,
}) {
  const ledger = expense.ledger || getExpenseLedger(expense);
  const meta = statusMeta(ledger.status);

  const selected =
    activeParent === "parent1"
      ? {
          name: parent1Name,
          color: parent1Color,
          share: ledger.parent1ShareAmount,
          paid: ledger.parent1PaidAmount,
          remaining: ledger.parent1Remaining,
          overpaid: ledger.parent1Overpaid,
        }
      : {
          name: parent2Name,
          color: parent2Color,
          share: ledger.parent2ShareAmount,
          paid: ledger.parent2PaidAmount,
          remaining: ledger.parent2Remaining,
          overpaid: ledger.parent2Overpaid,
        };

  const selectedClasses = getColorClasses(normalizeColorId(selected.color, "blue"), "blue");

  return (
    <button
      type="button"
      onClick={() => onPayment(expense)}
      className="w-full rounded-[1.35rem] border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          {expense.recurring ? <Repeat className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-black text-slate-950 md:text-base">{expense.title}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${meta.className}`}>
              {meta.label}
            </span>
            {expense.recurring && (
              <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
                Recurring
              </Badge>
            )}
          </div>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {expense.category} · {currency(ledger.amount)} · Split {ledger.splitType}
          </p>

          <div className={`mt-3 rounded-2xl border p-3 ${selectedClasses.border} ${selectedClasses.bg}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-xs font-black ${selectedClasses.textStrong}`}>
                {selected.name}
              </p>
              <p className={`text-xs font-black ${selected.remaining > 0 ? selectedClasses.textStrong : "text-emerald-700"}`}>
                Owes {currency(selected.remaining)}
              </p>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] font-bold">
              <div className="rounded-xl bg-white/70 p-2">
                <p className="text-slate-400">Share</p>
                <p className="text-slate-950">{currency(selected.share)}</p>
              </div>
              <div className="rounded-xl bg-white/70 p-2">
                <p className="text-slate-400">Paid</p>
                <p className="text-slate-950">{currency(selected.paid)}</p>
              </div>
              <div className="rounded-xl bg-white/80 p-2">
                <p className="text-slate-400">Left</p>
                <p className={selected.remaining > 0 ? selectedClasses.textStrong : "text-emerald-700"}>
                  {currency(selected.remaining)}
                </p>
              </div>
            </div>
          </div>

          {expense.reviewNote && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
              Review note: {expense.reviewNote}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={() => onEdit(expense)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label={`Edit ${expense.title}`}
          >
            <Pencil className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(expense)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            aria-label={`Delete ${expense.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </button>
  );
}

function PaymentModal({
  expense,
  activeParent,
  parent1Name,
  parent2Name,
  parent1Color,
  parent2Color,
  value,
  saving,
  onChange,
  onClose,
  onSubmit,
  onPayFull,
  onMarkReview,
}) {
  if (!expense) return null;

  const ledger = expense.ledger || getExpenseLedger(expense);

  const selected =
    activeParent === "parent1"
      ? {
          id: "parent1",
          name: parent1Name,
          color: parent1Color,
          share: ledger.parent1ShareAmount,
          paid: ledger.parent1PaidAmount,
          remaining: ledger.parent1Remaining,
        }
      : {
          id: "parent2",
          name: parent2Name,
          color: parent2Color,
          share: ledger.parent2ShareAmount,
          paid: ledger.parent2PaidAmount,
          remaining: ledger.parent2Remaining,
        };

  const classes = getColorClasses(normalizeColorId(selected.color, "blue"), "blue");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
              Record payment
            </p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{expense.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Apply payment for {selected.name}. Total expense: {currency(ledger.amount)}.
            </p>
          </div>

          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusMeta(ledger.status).className}`}>
            {statusMeta(ledger.status).label}
          </span>
        </div>

        <div className={`rounded-[1.5rem] border p-4 ${classes.border} ${classes.bg}`}>
          <p className={`text-sm font-black ${classes.textStrong}`}>{selected.name}</p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/75 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Share</p>
              <p className="mt-1 text-lg font-black text-slate-950">{currency(selected.share)}</p>
            </div>
            <div className="rounded-2xl bg-white/75 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Paid</p>
              <p className="mt-1 text-lg font-black text-slate-950">{currency(selected.paid)}</p>
            </div>
            <div className="rounded-2xl bg-white/85 p-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Remaining</p>
              <p className={`mt-1 text-xl font-black ${selected.remaining > 0 ? classes.textStrong : "text-emerald-700"}`}>
                {currency(selected.remaining)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <Button
            type="button"
            disabled={saving || selected.remaining <= 0}
            onClick={onPayFull}
            className="h-12 rounded-2xl font-black"
          >
            Pay full balance — {currency(selected.remaining)}
          </Button>

          <form onSubmit={onSubmit} className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Partial payment</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={value.amount}
                  onChange={(event) => onChange({ ...value, amount: event.target.value })}
                  placeholder="0.00"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Observation</span>
                <input
                  value={value.note}
                  onChange={(event) => onChange({ ...value, note: event.target.value })}
                  placeholder="Optional note"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                />
              </label>
            </div>

            <Button type="submit" disabled={saving} variant="outline" className="h-11 rounded-2xl font-black">
              Save partial payment
            </Button>
          </form>

          <button
            type="button"
            disabled={saving}
            onClick={onMarkReview}
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800 transition hover:bg-rose-100"
          >
            Mark this expense for review
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function ExpenseModal({
  open,
  mode,
  value,
  saving,
  parent1Name,
  parent2Name,
  onChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";
  const amount = toMoney(value.amount);
  const previewLedger = getExpenseLedger({
    amount,
    splitType: value.splitType,
    parent1ShareAmount: value.parent1ShareAmount,
    parent2ShareAmount: value.parent2ShareAmount,
    parent1PaidAmount: value.parent1PaidAmount,
    parent2PaidAmount: value.parent2PaidAmount,
  });

  const handleAmountChange = (nextAmount) => {
    onChange(applySplitDefaults(value, nextAmount, value.splitType));
  };

  const handleSplitChange = (nextSplitType) => {
    onChange(applySplitDefaults(value, value.amount, nextSplitType));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Budget expense</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{isEdit ? "Edit expense" : "Add expense"}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Enter the total cost, each parent&apos;s share, and how much each parent already paid.
          </p>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Title</span>
            <input
              value={value.title}
              onChange={(event) => onChange({ ...value, title: event.target.value })}
              placeholder="Example: Daycare"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Total amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.amount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder="0.00"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Split rule</span>
              <select
                value={value.splitType}
                onChange={(event) => handleSplitChange(event.target.value)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
              >
                <option>50/50</option>
                <option>Custom</option>
                <option>Parent 1 pays</option>
                <option>Parent 2 pays</option>
              </select>
            </label>

            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Due / note</span>
              <input
                value={value.due}
                onChange={(event) => onChange({ ...value, due: event.target.value })}
                placeholder="Example: May 25 or Paid"
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
              />
            </label>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.4rem] border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-950">{parent1Name}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Should pay</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.parent1ShareAmount}
                    onChange={(event) => onChange({ ...value, parent1ShareAmount: event.target.value, splitType: "Custom" })}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Already paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.parent1PaidAmount}
                    onChange={(event) => onChange({ ...value, parent1PaidAmount: event.target.value })}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-950">{parent2Name}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Should pay</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.parent2ShareAmount}
                    onChange={(event) => onChange({ ...value, parent2ShareAmount: event.target.value, splitType: "Custom" })}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Already paid</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value.parent2PaidAmount}
                    onChange={(event) => onChange({ ...value, parent2PaidAmount: event.target.value })}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Category</span>
              <select
                value={value.category}
                onChange={(event) => onChange({ ...value, category: event.target.value })}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-amber-300"
              >
                <option>School</option>
                <option>Medical</option>
                <option>Activities</option>
                <option>Clothes</option>
                <option>Childcare</option>
                <option>General</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <input
                type="checkbox"
                checked={value.recurring}
                onChange={(event) => onChange({ ...value, recurring: event.target.checked })}
                className="h-4 w-4"
              />
              <span className="text-sm font-black text-slate-700">Recurring expense</span>
            </label>
          </div>

          <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Preview</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                <p className="text-slate-950">{parent1Name}</p>
                <p className="text-slate-500">Share: {currency(previewLedger.parent1ShareAmount)}</p>
                <p className="text-slate-500">Paid: {currency(previewLedger.parent1PaidAmount)}</p>
                <p className={previewLedger.parent1Remaining > 0 ? "text-amber-700" : "text-emerald-700"}>
                  Still owes: {currency(previewLedger.parent1Remaining)}
                </p>
              </div>
              <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                <p className="text-slate-950">{parent2Name}</p>
                <p className="text-slate-500">Share: {currency(previewLedger.parent2ShareAmount)}</p>
                <p className="text-slate-500">Paid: {currency(previewLedger.parent2PaidAmount)}</p>
                <p className={previewLedger.parent2Remaining > 0 ? "text-amber-700" : "text-emerald-700"}>
                  Still owes: {currency(previewLedger.parent2Remaining)}
                </p>
              </div>
            </div>

            {previewLedger.validationErrors.length > 0 && (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-800">
                {previewLedger.validationErrors.map((error) => (
                  <p key={error}>• {error}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-full">
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="rounded-full bg-amber-600 hover:bg-amber-700">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add expense"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function BudgetHub() {
  const {
    user,
    familyId,
    dadName,
    momName,
    dadColor,
    momColor,
    custodyDadColor,
    custodyMomColor,
    custodyParentOverride,
  } = useFamily();

  const parent1Name = custodyParentOverride?.dadName || dadName || "Parent 1";
  const parent2Name = custodyParentOverride?.momName || momName || "Parent 2";
  const parent1Color = custodyParentOverride?.dadColor || custodyDadColor || dadColor || "blue";
  const parent2Color = custodyParentOverride?.momColor || custodyMomColor || momColor || "amber";

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseForm, setExpenseForm] = useState(emptyNewExpense);
  const [editingExpense, setEditingExpense] = useState(null);
  const [activeParentLedger, setActiveParentLedger] = useState("parent1");
  const [paymentExpense, setPaymentExpense] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", note: "" });
  const [savingPayment, setSavingPayment] = useState(false);

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
              const ledger = getExpenseLedger(expense);
              const payload = {
                ...expense,
                amount: ledger.amount,
                splitType: ledger.splitType,
                parent1ShareAmount: ledger.parent1ShareAmount,
                parent2ShareAmount: ledger.parent2ShareAmount,
                parent1PaidAmount: ledger.parent1PaidAmount,
                parent2PaidAmount: ledger.parent2PaidAmount,
                status: ledger.status,
                familyId,
                createdBy: user.uid,
                order: index,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };

              const docRef = await addDoc(collection(db, "custodyExpenses"), payload);

              return {
                ...payload,
                id: docRef.id,
                ledger: getExpenseLedger(payload),
              };
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
        if (!cancelled) {
          setExpenses(initialCustodyExpenses.map((expense) => ({ ...expense, ledger: getExpenseLedger(expense) })));
        }
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

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpense(null);
    setExpenseForm(emptyNewExpense);
  };

  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm(applySplitDefaults(emptyNewExpense, "", "50/50"));
    setShowExpenseModal(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseForm(expenseToForm(expense));
    setShowExpenseModal(true);
  };

  const saveExpense = async (event) => {
    event.preventDefault();

    if (!user || !familyId || savingExpense) return;

    const cleanTitle = expenseForm.title.trim();
    if (!cleanTitle) {
      window.alert("Please enter an expense title.");
      return;
    }

    const draftExpense = {
      title: cleanTitle,
      category: expenseForm.category,
      amount: toMoney(expenseForm.amount),
      splitType: expenseForm.splitType,
      parent1ShareAmount: toMoney(expenseForm.parent1ShareAmount),
      parent2ShareAmount: toMoney(expenseForm.parent2ShareAmount),
      parent1PaidAmount: toMoney(expenseForm.parent1PaidAmount),
      parent2PaidAmount: toMoney(expenseForm.parent2PaidAmount),
      due: expenseForm.due.trim(),
      recurring: Boolean(expenseForm.recurring),
    };

    const validationErrors = validateExpenseLedger(draftExpense);
    if (validationErrors.length > 0) {
      window.alert(`Please fix this expense before saving:\n\n${validationErrors.join("\n")}`);
      return;
    }

    const ledger = getExpenseLedger(draftExpense);

    setSavingExpense(true);

    try {
      const payload = {
        ...draftExpense,
        amount: ledger.amount,
        splitType: ledger.splitType,
        parent1ShareAmount: ledger.parent1ShareAmount,
        parent2ShareAmount: ledger.parent2ShareAmount,
        parent1PaidAmount: ledger.parent1PaidAmount,
        parent2PaidAmount: ledger.parent2PaidAmount,
        status: ledger.status,
        updatedAt: serverTimestamp(),
      };

      if (editingExpense) {
        await updateDoc(doc(db, "custodyExpenses", editingExpense.id), payload);
        setExpenses((current) =>
          current.map((expense) =>
            expense.id === editingExpense.id
              ? { ...expense, ...payload, ledger: getExpenseLedger(payload) }
              : expense
          )
        );
      } else {
        const order = expenses.length;
        const createPayload = {
          ...payload,
          familyId,
          createdBy: user.uid,
          order,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "custodyExpenses"), createPayload);
        setExpenses((current) => [
          ...current,
          { ...createPayload, id: docRef.id, ledger: getExpenseLedger(createPayload) },
        ]);
      }

      closeExpenseModal();
    } catch (error) {
      console.error("Error saving custody expense:", error);
      window.alert(`Could not save expense: ${error.message}`);
    } finally {
      setSavingExpense(false);
    }
  };

  const closePaymentModal = () => {
    setPaymentExpense(null);
    setPaymentForm({ amount: "", note: "" });
  };

  const openPaymentModal = (expense) => {
    setPaymentExpense(expense);
    setPaymentForm({ amount: "", note: "" });
  };

  const savePaymentForExpense = async ({ amount, note = "", reviewOnly = false }) => {
    if (!paymentExpense || !user || !familyId || savingPayment) return;

    const currentExpense = expenses.find((expense) => expense.id === paymentExpense.id) || paymentExpense;
    const currentLedger = currentExpense.ledger || getExpenseLedger(currentExpense);
    const cleanNote = String(note || "").trim();

    if (reviewOnly) {
      setSavingPayment(true);

      const reviewPayload = {
        reviewFlag: true,
        reviewNote: cleanNote || "Marked for review",
        status: "review",
        updatedAt: serverTimestamp(),
      };

      try {
        await updateDoc(doc(db, "custodyExpenses", currentExpense.id), reviewPayload);
        setExpenses((current) =>
          current.map((expense) =>
            expense.id === currentExpense.id
              ? {
                  ...expense,
                  ...reviewPayload,
                  updatedAt: undefined,
                  ledger: getExpenseLedger({ ...expense, ...reviewPayload }),
                }
              : expense
          )
        );
        closePaymentModal();
      } catch (error) {
        console.error("Error marking expense for review:", error);
        window.alert(`Could not mark for review: ${error.message}`);
      } finally {
        setSavingPayment(false);
      }

      return;
    }

    const cleanAmount = toMoney(amount);
    const selectedRemaining =
      activeParentLedger === "parent1"
        ? currentLedger.parent1Remaining
        : currentLedger.parent2Remaining;

    if (cleanAmount <= 0) {
      window.alert("Please enter a payment greater than $0.");
      return;
    }

    if (cleanAmount > selectedRemaining) {
      window.alert(`Payment cannot be greater than the remaining balance of ${currency(selectedRemaining)}.`);
      return;
    }

    const nextParent1Paid =
      activeParentLedger === "parent1"
        ? toMoney(currentLedger.parent1PaidAmount + cleanAmount)
        : currentLedger.parent1PaidAmount;

    const nextParent2Paid =
      activeParentLedger === "parent2"
        ? toMoney(currentLedger.parent2PaidAmount + cleanAmount)
        : currentLedger.parent2PaidAmount;

    const paymentRecord = {
      parent: activeParentLedger,
      amount: cleanAmount,
      note: cleanNote,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    };

    const updatedExpense = {
      ...currentExpense,
      parent1PaidAmount: nextParent1Paid,
      parent2PaidAmount: nextParent2Paid,
      reviewFlag: false,
      reviewNote: "",
    };

    const updatedLedger = getExpenseLedger(updatedExpense);

    const payload = {
      parent1PaidAmount: updatedLedger.parent1PaidAmount,
      parent2PaidAmount: updatedLedger.parent2PaidAmount,
      status: updatedLedger.status,
      reviewFlag: false,
      reviewNote: "",
      payments: [...(currentExpense.payments || []), paymentRecord],
      updatedAt: serverTimestamp(),
    };

    setSavingPayment(true);

    try {
      await updateDoc(doc(db, "custodyExpenses", currentExpense.id), payload);
      setExpenses((current) =>
        current.map((expense) =>
          expense.id === currentExpense.id
            ? {
                ...expense,
                ...payload,
                updatedAt: undefined,
                ledger: getExpenseLedger({ ...expense, ...payload }),
              }
            : expense
        )
      );
      closePaymentModal();
    } catch (error) {
      console.error("Error saving payment:", error);
      window.alert(`Could not save payment: ${error.message}`);
    } finally {
      setSavingPayment(false);
    }
  };

  const submitPartialPayment = async (event) => {
    event.preventDefault();
    await savePaymentForExpense({
      amount: paymentForm.amount,
      note: paymentForm.note,
    });
  };

  const deleteExpense = async (expenseToDelete) => {
    const confirmed = window.confirm(`Delete "${expenseToDelete.title}" from shared expenses?`);
    if (!confirmed) return;

    const previousExpenses = expenses;
    setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));

    try {
      await deleteDoc(doc(db, "custodyExpenses", expenseToDelete.id));
    } catch (error) {
      console.error("Error deleting custody expense:", error);
      setExpenses(previousExpenses);
      window.alert(`Could not delete expense: ${error.message}`);
    }
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <BudgetHero loading={loading} total={summary.total} paid={summary.paid} remaining={summary.remaining} />

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            icon={WalletCards}
            label="Total expenses"
            value={currency(summary.total)}
            helper={`${summary.totalCount} tracked expense(s)`}
            tone="amber"
          />
          <SummaryCard
            icon={Scale}
            label="Total paid"
            value={currency(summary.paid)}
            helper={`${currency(summary.remaining)} still owed`}
            tone="blue"
          />
          <SummaryCard
            icon={CheckCircle2}
            label="Fully paid"
            value={`${summary.paidCount}`}
            helper={`${summary.partialCount} partial · ${summary.openCount} open · ${summary.reviewCount} review`}
            tone={summary.reviewCount > 0 ? "rose" : "emerald"}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_0.82fr]">
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
                  Use the parent toggle to focus each expense breakdown.
                </p>
              </div>

              <Button type="button" onClick={openAddExpense} className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                Add expense
              </Button>
            </div>

            <div className="space-y-3">
              {expenses.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  activeParent={activeParentLedger}
                  parent1Name={parent1Name}
                  parent2Name={parent2Name}
                  parent1Color={parent1Color}
                  parent2Color={parent2Color}
                  onPayment={openPaymentModal}
                  onEdit={openEditExpense}
                  onDelete={deleteExpense}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-6">
            <ParentLedgerPanel
              activeParent={activeParentLedger}
              setActiveParent={setActiveParentLedger}
              parent1Name={parent1Name}
              parent2Name={parent2Name}
              parent1Color={parent1Color}
              parent2Color={parent2Color}
              summary={summary}
            />

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
                    Next backend step: attach receipt images, notes, approval history, and payment audit trail.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-emerald-100 bg-emerald-50/70 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] md:p-6">
              <div className="flex items-start gap-4">
                <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-black text-emerald-900">
                    Clear, not confrontational
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    This ledger avoids guessing. It shows each parent&apos;s share, each parent&apos;s payments, and the exact remaining balance.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <PaymentModal
          expense={paymentExpense}
          activeParent={activeParentLedger}
          parent1Name={parent1Name}
          parent2Name={parent2Name}
          parent1Color={parent1Color}
          parent2Color={parent2Color}
          value={paymentForm}
          saving={savingPayment}
          onChange={setPaymentForm}
          onClose={closePaymentModal}
          onSubmit={submitPartialPayment}
          onPayFull={() => {
            const ledger = paymentExpense?.ledger || getExpenseLedger(paymentExpense || {});
            const amount = activeParentLedger === "parent1" ? ledger.parent1Remaining : ledger.parent2Remaining;
            savePaymentForExpense({ amount, note: paymentForm.note });
          }}
          onMarkReview={() => savePaymentForExpense({ reviewOnly: true, note: paymentForm.note })}
        />

        <ExpenseModal
          open={showExpenseModal}
          mode={editingExpense ? "edit" : "add"}
          value={expenseForm}
          saving={savingExpense}
          parent1Name={parent1Name}
          parent2Name={parent2Name}
          onChange={setExpenseForm}
          onClose={closeExpenseModal}
          onSubmit={saveExpense}
        />
      </div>
    </div>
  );
}
