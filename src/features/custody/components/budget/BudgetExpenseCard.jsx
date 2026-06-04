import React from "react";
import { Pencil, ReceiptText, Repeat, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { currency, getExpenseDueStatus, getExpenseLedger } from "@/data/custodyBudget";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";

function statusMeta(status) {
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

export default function BudgetExpenseCard({
  expense,
  activeParent,
  parent1Name,
  parent2Name,
  parent1Color,
  parent2Color,
  onOpen,
  onEdit,
  onDelete,
  canWrite = true,
}) {
  const ledger = expense.ledger || getExpenseLedger(expense);
  const dueStatus = getExpenseDueStatus(expense, ledger);

  const selected =
    activeParent === "parent1"
      ? {
          name: parent1Name,
          color: parent1Color,
          share: ledger.parent1ShareAmount,
          paid: ledger.parent1PaidAmount,
          remaining: ledger.parent1Remaining,
        }
      : {
          name: parent2Name,
          color: parent2Color,
          share: ledger.parent2ShareAmount,
          paid: ledger.parent2PaidAmount,
          remaining: ledger.parent2Remaining,
        };

  const other =
    activeParent === "parent1"
      ? { name: parent2Name, remaining: ledger.parent2Remaining }
      : { name: parent1Name, remaining: ledger.parent1Remaining };

  const color = getColorClasses(normalizeColorId(selected.color, "blue"), "blue");

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(expense)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen(expense);
      }}
      className="w-full cursor-pointer rounded-[1.35rem] border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-200"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          {expense.recurring ? <Repeat className="h-5 w-5" /> : <ReceiptText className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-black text-slate-950">{expense.title}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${statusMeta(ledger.status)}`}>
              {statusLabel(ledger.status)}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-black ${dueStatus.className}`}>
              {dueStatus.label}
            </span>
            {expense.recurring && (
              <Badge variant="secondary" className="rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50">
                Monthly
              </Badge>
            )}
          </div>

          <p className="mt-1 text-xs font-bold text-slate-500">
            {expense.category} | {currency(ledger.amount)} | Split {ledger.splitType}
          </p>

          <div className="mt-3 grid gap-2 md:grid-cols-[1fr_150px]">
            <div className={`rounded-2xl border p-3 ${color.border} ${color.bg}`}>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs font-black ${color.textStrong}`}>{selected.name}</p>
                <p className={`text-xs font-black ${selected.remaining > 0 ? color.textStrong : "text-emerald-700"}`}>
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
                  <p className={selected.remaining > 0 ? color.textStrong : "text-emerald-700"}>
                    {currency(selected.remaining)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-500">
              <p className="text-slate-400">Other parent</p>
              <p className="mt-1 text-sm font-black text-slate-800">{other.name}</p>
              <p className="mt-1">
                Owes{" "}
                <span className={other.remaining > 0 ? "text-amber-700" : "text-emerald-700"}>
                  {currency(other.remaining)}
                </span>
              </p>
            </div>
          </div>

          {expense.reviewNote && (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800">
              Review note: {expense.reviewNote}
            </p>
          )}
        </div>

        {canWrite && (
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
        )}
      </div>
    </article>
  );
}
