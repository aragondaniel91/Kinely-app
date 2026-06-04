import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currency, getExpenseLedger } from "@/data/custodyBudget";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";

function statusClass(status) {
  if (status === "paid") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "partial") return "border-amber-200 bg-amber-50 text-amber-700";
  if (status === "open") return "border-slate-200 bg-slate-50 text-slate-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function statusLabel(status) {
  if (status === "paid") return "Paid";
  if (status === "partial") return "Partial";
  if (status === "open") return "Open";
  return "Review";
}

function lastOpenPayment(expense, parentId) {
  const payments = Array.isArray(expense?.payments) ? expense.payments : [];
  const reversedIds = new Set(
    payments
      .filter((payment) => payment.type === "reversal" && payment.reversesPaymentId)
      .map((payment) => payment.reversesPaymentId)
  );

  return [...payments]
    .reverse()
    .find((payment) => payment.parent === parentId && payment.type !== "reversal" && !reversedIds.has(payment.id));
}

export default function BudgetExpenseDetail({
  expense,
  activeParent,
  parent1Name,
  parent2Name,
  parent1Color,
  parent2Color,
  saving,
  onClose,
  onPay,
  onUndo,
  onMarkReview,
  onClearReview,
  canWrite = true,
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const ledger = useMemo(() => (expense ? getExpenseLedger(expense) : null), [expense]);
  if (!expense || !ledger) return null;

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
  const undoPayment = lastOpenPayment(expense, selected.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 md:items-center md:p-6">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-4 shadow-lg md:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Expense detail</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{expense.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Total {currency(ledger.amount)} | Split {ledger.splitType}
            </p>
          </div>

          <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(ledger.status)}`}>
            {statusLabel(ledger.status)}
          </span>
        </div>

        <div className={`rounded-[1.5rem] border p-4 ${classes.border} ${classes.bg}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={`text-sm font-black ${classes.textStrong}`}>{selected.name}</p>
            <p className={`text-sm font-black ${selected.remaining > 0 ? classes.textStrong : "text-emerald-700"}`}>
              Owes {currency(selected.remaining)}
            </p>
          </div>

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

        {canWrite ? (
          <div className="mt-4 grid gap-3">
            <Button
              type="button"
              disabled={saving || selected.remaining <= 0}
              onClick={() => onPay({ amount: selected.remaining, note })}
              className="h-12 rounded-2xl font-black"
            >
              Pay full balance - {currency(selected.remaining)}
            </Button>

            {undoPayment && (
              <button
                type="button"
                disabled={saving}
                onClick={() => onUndo(undoPayment)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                Undo last payment - {currency(undoPayment.amount)}
              </button>
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onPay({ amount, note });
              }}
              className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Partial payment</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0.00"
                    className="rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-800 focus-visible:ring-amber-100"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Observation</span>
                  <Input
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional note"
                    className="rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-800 focus-visible:ring-amber-100"
                  />
                </label>
              </div>

              <Button type="submit" disabled={saving} variant="outline" className="h-11 rounded-2xl font-black">
                Save partial payment
              </Button>
            </form>

            {expense.reviewFlag ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => onClearReview()}
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
              >
                Clear review status
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={() => onMarkReview(note)}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800 transition hover:bg-rose-100"
              >
                Mark this expense for review
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
            You have view-only access to this custody budget.
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="h-10 rounded-full px-5 font-black">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
