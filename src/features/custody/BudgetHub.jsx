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
  BadgeDollarSign,
  CheckCircle2,
  FileText,
  HeartHandshake,
  Plus,
  Scale,
  WalletCards,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import { currency, getBudgetSummary, getExpenseLedger, initialCustodyExpenses, validateExpenseLedger } from "@/data/custodyBudget";
import BudgetExpenseCard from "./components/budget/BudgetExpenseCard";
import BudgetExpenseDetail from "./components/budget/BudgetExpenseDetail";
import BudgetExpenseWizard from "./components/budget/BudgetExpenseWizard";
import BudgetAppDialog from "./components/budget/BudgetAppDialog";

function toMoney(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100) / 100;
}

function makePaymentId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
    dueDate: data.dueDate || "",
    dueDayOfMonth: data.dueDayOfMonth || "",
    recurring: Boolean(data.recurring),
    payments: Array.isArray(data.payments) ? data.payments : [],
    reviewFlag: Boolean(data.reviewFlag),
    reviewNote: data.reviewNote || "",
    order: data.order ?? 999,
    paidBy: data.paidBy || "Shared",
    split: data.split || "50/50",
    status: data.status || "review",
  };

  return {
    ...expense,
    ledger: getExpenseLedger(expense),
  };
}

function BudgetHero({ total, paid, remaining, loading }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-sm">
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

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Total expenses</p>
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
    <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-sm">
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
    { id: "parent1", name: parent1Name, color: parent1Color, remaining: summary.parent1Remaining },
    { id: "parent2", name: parent2Name, color: parent2Color, remaining: summary.parent2Remaining },
  ];

  return (
    <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Parent ledger</p>
        <h3 className="mt-1 text-2xl font-black text-slate-950">Balance by parent</h3>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          Tap a parent to focus totals and expense breakdowns.
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
              className={`rounded-2xl border px-3 py-3 text-left transition ${
                active ? `${optionClasses.border} ${optionClasses.bg}` : "border-slate-200 bg-slate-50 hover:bg-white"
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
  const [activeParentLedger, setActiveParentLedger] = useState("parent1");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const [detailExpense, setDetailExpense] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deletingExpense, setDeletingExpense] = useState(false);

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
              return { ...payload, id: docRef.id, ledger: getExpenseLedger(payload) };
            })
          );

          if (!cancelled) setExpenses(createdExpenses);
          return;
        }

        const data = snap.docs.map(normalizeExpenseDoc).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
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

  const openAddExpense = () => {
    setEditingExpense(null);
    setWizardOpen(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setEditingExpense(null);
    setWizardOpen(false);
  };

  const refreshExpenseInState = (id, payload) => {
    setExpenses((current) =>
      current.map((expense) =>
        expense.id === id
          ? { ...expense, ...payload, updatedAt: undefined, ledger: getExpenseLedger({ ...expense, ...payload }) }
          : expense
      )
    );

    setDetailExpense((current) =>
      current?.id === id
        ? { ...current, ...payload, updatedAt: undefined, ledger: getExpenseLedger({ ...current, ...payload }) }
        : current
    );
  };

  const showNotice = ({ tone = "warning", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const saveExpense = async (draftExpense) => {
    if (!user || !familyId || savingExpense) return;

    if (!draftExpense.title) {
      showNotice({
        tone: "warning",
        title: "Missing expense title",
        message: "Please enter an expense title before saving.",
      });
      return;
    }

    const validationErrors = validateExpenseLedger(draftExpense);
    if (validationErrors.length > 0) {
      showNotice({
        tone: "warning",
        title: "Expense needs attention",
        message: validationErrors.join("\n"),
      });
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
        refreshExpenseInState(editingExpense.id, payload);
      } else {
        const createPayload = {
          ...payload,
          familyId,
          createdBy: user.uid,
          order: expenses.length,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "custodyExpenses"), createPayload);
        setExpenses((current) => [
          ...current,
          { ...createPayload, id: docRef.id, ledger: getExpenseLedger(createPayload) },
        ]);
      }

      closeWizard();
    } catch (error) {
      console.error("Error saving custody expense:", error);
      showNotice({
        tone: "danger",
        title: "Could not save expense",
        message: error.message,
      });
    } finally {
      setSavingExpense(false);
    }
  };

  const savePayment = async ({ amount, note = "" }) => {
    if (!detailExpense || !user || !familyId || savingPayment) return;

    const currentExpense = expenses.find((expense) => expense.id === detailExpense.id) || detailExpense;
    const currentLedger = currentExpense.ledger || getExpenseLedger(currentExpense);
    const cleanAmount = toMoney(amount);
    const cleanNote = String(note || "").trim();

    const selectedRemaining =
      activeParentLedger === "parent1" ? currentLedger.parent1Remaining : currentLedger.parent2Remaining;

    if (cleanAmount <= 0) {
      showNotice({
        tone: "warning",
        title: "Invalid payment amount",
        message: "Please enter a payment greater than $0.",
      });
      return;
    }

    if (cleanAmount > selectedRemaining) {
      showNotice({
        tone: "warning",
        title: "Payment is too high",
        message: `Payment cannot be greater than the remaining balance of ${currency(selectedRemaining)}.`,
      });
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
      id: makePaymentId(),
      type: "payment",
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
      payments: [...(currentExpense.payments || []), paymentRecord],
    };

    const updatedLedger = getExpenseLedger(updatedExpense);

    const payload = {
      parent1PaidAmount: updatedLedger.parent1PaidAmount,
      parent2PaidAmount: updatedLedger.parent2PaidAmount,
      status: updatedLedger.status,
      reviewFlag: false,
      reviewNote: "",
      payments: updatedExpense.payments,
      updatedAt: serverTimestamp(),
    };

    setSavingPayment(true);

    try {
      await updateDoc(doc(db, "custodyExpenses", currentExpense.id), payload);
      refreshExpenseInState(currentExpense.id, payload);
    } catch (error) {
      console.error("Error saving payment:", error);
      showNotice({
        tone: "danger",
        title: "Could not save payment",
        message: error.message,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const undoPayment = async (payment) => {
    if (!detailExpense || !payment || !user || savingPayment) return;

    const currentExpense = expenses.find((expense) => expense.id === detailExpense.id) || detailExpense;
    const currentLedger = currentExpense.ledger || getExpenseLedger(currentExpense);
    const amountToReverse = toMoney(payment.amount);

    const nextParent1Paid =
      payment.parent === "parent1"
        ? Math.max(0, toMoney(currentLedger.parent1PaidAmount - amountToReverse))
        : currentLedger.parent1PaidAmount;

    const nextParent2Paid =
      payment.parent === "parent2"
        ? Math.max(0, toMoney(currentLedger.parent2PaidAmount - amountToReverse))
        : currentLedger.parent2PaidAmount;

    const reversalRecord = {
      id: makePaymentId(),
      type: "reversal",
      parent: payment.parent,
      amount: amountToReverse,
      reversesPaymentId: payment.id,
      note: `Reversed payment from ${payment.createdAt || "previous entry"}`,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    };

    const updatedExpense = {
      ...currentExpense,
      parent1PaidAmount: nextParent1Paid,
      parent2PaidAmount: nextParent2Paid,
      payments: [...(currentExpense.payments || []), reversalRecord],
    };

    const updatedLedger = getExpenseLedger(updatedExpense);

    const payload = {
      parent1PaidAmount: updatedLedger.parent1PaidAmount,
      parent2PaidAmount: updatedLedger.parent2PaidAmount,
      status: updatedLedger.status,
      payments: updatedExpense.payments,
      updatedAt: serverTimestamp(),
    };

    setSavingPayment(true);

    try {
      await updateDoc(doc(db, "custodyExpenses", currentExpense.id), payload);
      refreshExpenseInState(currentExpense.id, payload);
    } catch (error) {
      console.error("Error undoing payment:", error);
      showNotice({
        tone: "danger",
        title: "Could not undo payment",
        message: error.message,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const setReview = async (reviewFlag, note = "") => {
    if (!detailExpense || !user || savingPayment) return;

    const currentExpense = expenses.find((expense) => expense.id === detailExpense.id) || detailExpense;
    const updatedExpense = {
      ...currentExpense,
      reviewFlag,
      reviewNote: reviewFlag ? String(note || "").trim() || "Marked for review" : "",
    };

    const updatedLedger = getExpenseLedger(updatedExpense);

    const payload = {
      reviewFlag,
      reviewNote: updatedExpense.reviewNote,
      status: updatedLedger.status,
      updatedAt: serverTimestamp(),
    };

    setSavingPayment(true);

    try {
      await updateDoc(doc(db, "custodyExpenses", currentExpense.id), payload);
      refreshExpenseInState(currentExpense.id, payload);
    } catch (error) {
      console.error("Error updating review status:", error);
      showNotice({
        tone: "danger",
        title: "Could not update review status",
        message: error.message,
      });
    } finally {
      setSavingPayment(false);
    }
  };

  const deleteExpense = (expenseToDelete) => {
    setDeleteCandidate(expenseToDelete);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteCandidate || deletingExpense) return;

    const expenseToDelete = deleteCandidate;
    const previousExpenses = expenses;

    setDeletingExpense(true);
    setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));

    try {
      await deleteDoc(doc(db, "custodyExpenses", expenseToDelete.id));
      setDeleteCandidate(null);
    } catch (error) {
      console.error("Error deleting custody expense:", error);
      setExpenses(previousExpenses);
      showNotice({
        tone: "danger",
        title: "Could not delete expense",
        message: error.message,
      });
    } finally {
      setDeletingExpense(false);
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
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Shared expenses</p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">Child-related costs</h3>
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
                <BudgetExpenseCard
                  key={expense.id}
                  expense={expense}
                  activeParent={activeParentLedger}
                  parent1Name={parent1Name}
                  parent2Name={parent2Name}
                  parent1Color={parent1Color}
                  parent2Color={parent2Color}
                  onOpen={setDetailExpense}
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

            <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Receipts</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">Attach proof later</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    Next backend step: attach receipt images, notes, approval history, and payment audit trail.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[2rem] border-emerald-100 bg-emerald-50/70 p-5 shadow-sm md:p-6">
              <div className="flex items-start gap-4">
                <HeartHandshake className="mt-1 h-6 w-6 shrink-0 text-emerald-700" />
                <div>
                  <p className="text-sm font-black text-emerald-900">Clear, not confrontational</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                    This ledger avoids guessing. It shows each parent&apos;s share, payments, and exact remaining balance.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <BudgetExpenseDetail
          expense={detailExpense}
          activeParent={activeParentLedger}
          parent1Name={parent1Name}
          parent2Name={parent2Name}
          parent1Color={parent1Color}
          parent2Color={parent2Color}
          saving={savingPayment}
          onClose={() => setDetailExpense(null)}
          onPay={savePayment}
          onUndo={undoPayment}
          onMarkReview={(note) => setReview(true, note)}
          onClearReview={() => setReview(false)}
        />

        <BudgetAppDialog
          open={Boolean(deleteCandidate)}
          tone="danger"
          title="Delete expense?"
          message={
            deleteCandidate
              ? `This will permanently remove "${deleteCandidate.title}" from the shared budget.`
              : ""
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          loading={deletingExpense}
          onConfirm={confirmDeleteExpense}
          onCancel={() => setDeleteCandidate(null)}
        />

        <BudgetAppDialog
          open={Boolean(noticeDialog)}
          tone={noticeDialog?.tone}
          title={noticeDialog?.title}
          message={noticeDialog?.message}
          confirmLabel="Got it"
          onConfirm={() => setNoticeDialog(null)}
          onCancel={() => setNoticeDialog(null)}
        />

        <BudgetExpenseWizard
          open={wizardOpen}
          mode={editingExpense ? "edit" : "add"}
          initialExpense={editingExpense}
          parent1Name={parent1Name}
          parent2Name={parent2Name}
          saving={savingExpense}
          onClose={closeWizard}
          onSave={saveExpense}
        />
      </div>
    </div>
  );
}
