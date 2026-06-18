import React, { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currency, getExpenseLedger, validateExpenseLedger } from "@/data/custodyBudget";

const emptyExpense = {
  title: "",
  category: "School",
  amount: "",
  splitType: "50/50",
  parent1ShareAmount: "",
  parent2ShareAmount: "",
  parent1PaidAmount: "",
  parent2PaidAmount: "",
  due: "",
  dueDate: "",
  dueDayOfMonth: "",
  recurring: false,
};

function toMoney(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100) / 100;
}

function moneyInput(value) {
  if (value === undefined || value === null || value === "") return "";
  return String(value);
}

function applySplitDefaults(form, amountValue = form.amount, splitType = form.splitType) {
  const amount = toMoney(amountValue);

  if (!amount || amount <= 0) return { ...form, amount: amountValue, splitType };

  if (splitType === "50/50") {
    const parent1Share = Math.round((amount / 2) * 100) / 100;
    return {
      ...form,
      amount: String(amountValue),
      splitType,
      parent1ShareAmount: String(parent1Share),
      parent2ShareAmount: String(Math.round((amount - parent1Share) * 100) / 100),
    };
  }

  if (splitType === "Parent 1 pays") {
    return {
      ...form,
      amount: String(amountValue),
      splitType,
      parent1ShareAmount: String(amount),
      parent2ShareAmount: "0",
    };
  }

  if (splitType === "Parent 2 pays") {
    return {
      ...form,
      amount: String(amountValue),
      splitType,
      parent1ShareAmount: "0",
      parent2ShareAmount: String(amount),
    };
  }

  return { ...form, amount: String(amountValue), splitType };
}

function formFromExpense(expense) {
  if (!expense) return emptyExpense;

  const ledger = getExpenseLedger(expense);

  return {
    title: expense.title || "",
    category: expense.category || "School",
    amount: moneyInput(ledger.amount),
    splitType: ledger.splitType || "50/50",
    parent1ShareAmount: moneyInput(ledger.parent1ShareAmount),
    parent2ShareAmount: moneyInput(ledger.parent2ShareAmount),
    parent1PaidAmount: moneyInput(ledger.parent1PaidAmount),
    parent2PaidAmount: moneyInput(ledger.parent2PaidAmount),
    due: expense.due || "",
    dueDate: expense.dueDate || "",
    dueDayOfMonth: expense.dueDayOfMonth ? String(expense.dueDayOfMonth) : "",
    recurring: Boolean(expense.recurring),
  };
}

function FieldLabel({ children }) {
  return <span className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">{children}</span>;
}

function TextInput(props) {
  return (
    <Input
      {...props}
      className="rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-800 focus-visible:ring-amber-100"
    />
  );
}

function SelectInput({ value, onChange, children, ...props }) {
  return (
    <Select value={value} onValueChange={(nextValue) => onChange?.({ target: { value: nextValue } })}>
      <SelectTrigger
        {...props}
        className="rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-800 focus:ring-amber-100"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {children}
      </SelectContent>
    </Select>
  );
}

export default function BudgetExpenseWizard({
  open,
  mode,
  initialExpense,
  parent1Name,
  parent2Name,
  saving,
  onClose,
  onSave,
}) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyExpense);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(formFromExpense(initialExpense));
  }, [open, initialExpense]);

  const ledger = useMemo(
    () =>
      getExpenseLedger({
        amount: toMoney(form.amount),
        splitType: form.splitType,
        parent1ShareAmount: toMoney(form.parent1ShareAmount),
        parent2ShareAmount: toMoney(form.parent2ShareAmount),
        parent1PaidAmount: toMoney(form.parent1PaidAmount),
        parent2PaidAmount: toMoney(form.parent2PaidAmount),
      }),
    [form]
  );

  const validationErrors = validateExpenseLedger({
    amount: toMoney(form.amount),
    splitType: form.splitType,
    parent1ShareAmount: toMoney(form.parent1ShareAmount),
    parent2ShareAmount: toMoney(form.parent2ShareAmount),
    parent1PaidAmount: toMoney(form.parent1PaidAmount),
    parent2PaidAmount: toMoney(form.parent2PaidAmount),
  });

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();

    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    onSave({
      title: form.title.trim(),
      category: form.category,
      amount: toMoney(form.amount),
      splitType: form.splitType,
      parent1ShareAmount: toMoney(form.parent1ShareAmount),
      parent2ShareAmount: toMoney(form.parent2ShareAmount),
      parent1PaidAmount: toMoney(form.parent1PaidAmount),
      parent2PaidAmount: toMoney(form.parent2PaidAmount),
      due: form.due.trim(),
      dueDate: form.dueDate || "",
      dueDayOfMonth: form.dueDayOfMonth ? Number(form.dueDayOfMonth) : "",
      recurring: Boolean(form.recurring),
    });
  };

  const title = mode === "edit" ? "Edit expense" : "Add expense";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 md:items-center md:p-6">
      <form onSubmit={submit} className="w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-4 shadow-lg md:p-6">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Budget expense</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Step {step} of 3 · Keep the expense clear and easy to audit.
          </p>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className={`h-2 rounded-full ${item <= step ? "bg-amber-500" : "bg-slate-100"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <FieldLabel>Title</FieldLabel>
              <TextInput
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Example: Daycare"
                required
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <FieldLabel>Total amount</FieldLabel>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => setForm(applySplitDefaults(form, event.target.value, form.splitType))}
                  placeholder="0.00"
                  required
                />
              </label>

              <label className="grid gap-1.5">
                <FieldLabel>Category</FieldLabel>
                <SelectInput value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <SelectItem value="School">School</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Activities">Activities</SelectItem>
                  <SelectItem value="Clothes">Clothes</SelectItem>
                  <SelectItem value="Childcare">Childcare</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectInput>
              </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5">
                <FieldLabel>Due date</FieldLabel>
                <TextInput
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
                />
              </label>

              <label className="grid gap-1.5">
                <FieldLabel>Note</FieldLabel>
                <TextInput
                  value={form.due}
                  onChange={(event) => setForm({ ...form, due: event.target.value })}
                  placeholder="Receipt, invoice, or note"
                />
              </label>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm font-black text-slate-700">Recurring monthly expense</span>
                <Switch
                  checked={form.recurring}
                  onCheckedChange={(checked) => setForm({ ...form, recurring: checked })}
                />
              </label>

              {form.recurring && (
                <label className="mt-3 grid gap-1.5">
                  <FieldLabel>Monthly due day</FieldLabel>
                  <TextInput
                    type="number"
                    min="1"
                    max="31"
                    value={form.dueDayOfMonth}
                    onChange={(event) => setForm({ ...form, dueDayOfMonth: event.target.value })}
                    placeholder="15"
                  />
                </label>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3">
            <label className="grid gap-1.5">
              <FieldLabel>Split rule</FieldLabel>
              <SelectInput
                value={form.splitType}
                onChange={(event) => setForm(applySplitDefaults(form, form.amount, event.target.value))}
              >
                <SelectItem value="50/50">50/50</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
                <SelectItem value="Parent 1 pays">Parent 1 pays</SelectItem>
                <SelectItem value="Parent 2 pays">Parent 2 pays</SelectItem>
              </SelectInput>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{parent1Name}</p>
                <label className="mt-3 grid gap-1.5">
                  <FieldLabel>Should pay</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.parent1ShareAmount}
                    onChange={(event) => setForm({ ...form, parent1ShareAmount: event.target.value, splitType: "Custom" })}
                  />
                </label>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{parent2Name}</p>
                <label className="mt-3 grid gap-1.5">
                  <FieldLabel>Should pay</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.parent2ShareAmount}
                    onChange={(event) => setForm({ ...form, parent2ShareAmount: event.target.value, splitType: "Custom" })}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{parent1Name}</p>
                <label className="mt-3 grid gap-1.5">
                  <FieldLabel>Already paid</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.parent1PaidAmount}
                    onChange={(event) => setForm({ ...form, parent1PaidAmount: event.target.value })}
                  />
                </label>
              </div>

              <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-black text-slate-950">{parent2Name}</p>
                <label className="mt-3 grid gap-1.5">
                  <FieldLabel>Already paid</FieldLabel>
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.parent2PaidAmount}
                    onChange={(event) => setForm({ ...form, parent2PaidAmount: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Preview</p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                  <p className="text-slate-950">{parent1Name}</p>
                  <p className="text-slate-500">Share: {currency(ledger.parent1ShareAmount)}</p>
                  <p className="text-slate-500">Paid: {currency(ledger.parent1PaidAmount)}</p>
                  <p className={ledger.parent1Remaining > 0 ? "text-amber-700" : "text-emerald-700"}>
                    Still owes: {currency(ledger.parent1Remaining)}
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-sm font-bold">
                  <p className="text-slate-950">{parent2Name}</p>
                  <p className="text-slate-500">Share: {currency(ledger.parent2ShareAmount)}</p>
                  <p className="text-slate-500">Paid: {currency(ledger.parent2PaidAmount)}</p>
                  <p className={ledger.parent2Remaining > 0 ? "text-amber-700" : "text-emerald-700"}>
                    Still owes: {currency(ledger.parent2Remaining)}
                  </p>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold leading-5 text-rose-800">
                  {validationErrors.map((error) => (
                    <p key={error}>• {error}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-between gap-3">
          <Button type="button" variant="outline" onClick={step === 1 ? onClose : () => setStep((current) => current - 1)} disabled={saving} className="h-10 rounded-full px-5 font-black">
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          <Button type="submit" disabled={saving} className="h-10 rounded-full bg-amber-600 px-5 font-black hover:bg-amber-700">
            {saving ? "Saving..." : step === 3 ? (mode === "edit" ? "Save changes" : "Add expense") : "Next"}
          </Button>
        </div>
      </form>
    </div>
  );
}
