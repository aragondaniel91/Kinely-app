import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
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
import { canReadModule, canWriteModule } from "@/lib/modulePermissions";
import { getColorClasses, normalizeColorId } from "@/lib/appColorUtils";
import { uniqueFirestoreDocsFromSnapshots } from "@/core/firestore/firestoreDocUtils";
import {
  deleteCustodyScopedRecordViaWorker,
  saveCustodyScopedRecordViaWorker,
} from "@/services/custodyBackendService";
import { queueFamilyActivity } from "@/services/familyActivityService";
import { currency, getBudgetSummary, getExpenseLedger, validateExpenseLedger } from "@/data/custodyBudget";
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

function normalizeExpenseData(data = {}, id = "") {
  const expense = {
    id: data.id || id,
    title: data.title || "Expense",
    category: data.category || "General",
    amount: Number(data.amount || 0),
    splitType: data.splitType || data.split_type || data.split || "50/50",
    parent1ShareAmount: data.parent1ShareAmount ?? data.parent1_share_amount,
    parent2ShareAmount: data.parent2ShareAmount ?? data.parent2_share_amount,
    parent1PaidAmount: data.parent1PaidAmount ?? data.parent1_paid_amount,
    parent2PaidAmount: data.parent2PaidAmount ?? data.parent2_paid_amount,
    due: data.due || "",
    dueDate: data.dueDate || data.due_date || "",
    dueDayOfMonth: data.dueDayOfMonth || data.due_day_of_month || "",
    recurring: Boolean(data.recurring),
    payments: Array.isArray(data.payments) ? data.payments : [],
    reviewFlag: Boolean(data.reviewFlag ?? data.review_flag),
    reviewNote: data.reviewNote || data.review_note || "",
    order: data.order ?? 999,
    paidBy: data.paidBy || data.paid_by || "Shared",
    split: data.split || data.splitType || data.split_type || "50/50",
    status: data.status || "review",
  };

  return {
    ...expense,
    ledger: getExpenseLedger(expense),
  };
}

function normalizeExpenseDoc(docSnap) {
  return normalizeExpenseData(docSnap.data(), docSnap.id);
}

function sortExpenses(items = []) {
  return [...items].sort((a, b) => {
    const leftOrder = a.order ?? 999;
    const rightOrder = b.order ?? 999;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(a.title || "").localeCompare(String(b.title || ""));
  });
}

function expenseActivityType(action) {
  if (action === "created") return "custody_budget_created";
  if (action === "deleted") return "custody_budget_deleted";
  return "custody_budget_updated";
}

function expenseActivityTitle(action, expense) {
  if (action === "created") return "Budget expense added";
  if (action === "deleted") return "Budget expense deleted";
  if (action === "payment") return "Budget payment recorded";
  if (action === "payment_reversed") return "Budget payment reversed";
  if (action === "review") return expense.reviewFlag ? "Budget expense marked for review" : "Budget review cleared";
  return "Budget expense updated";
}

function expenseActivityDescription(action, expense, parent1Name, parent2Name, focusedParent = "") {
  const ledger = getExpenseLedger(expense);
  const amount = currency(ledger.amount);
  const payerName =
    focusedParent === "parent1"
      ? parent1Name
      : focusedParent === "parent2"
        ? parent2Name
        : "";

  if (action === "payment") {
    return `${payerName || "A parent"} recorded a payment for ${expense.title}. Remaining balance: ${currency(ledger.remainingTotal)}.`;
  }

  if (action === "payment_reversed") {
    return `${payerName || "A parent"} reversed a payment for ${expense.title}. Remaining balance: ${currency(ledger.remainingTotal)}.`;
  }

  if (action === "review") {
    return expense.reviewFlag
      ? `${expense.title} was marked for review.`
      : `${expense.title} review status was cleared.`;
  }

  if (action === "deleted") {
    return `${expense.title} (${amount}) was removed from the shared custody budget.`;
  }

  return `${expense.title} (${amount}) is tracked in the shared custody budget.`;
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
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup,
    dadName,
    momName,
    dadColor,
    momColor,
    custodyDadColor,
    custodyMomColor,
    custodyParentOverride,
    perms,
    profile,
  } = useFamily();

  const parent1Name = custodyParentOverride?.dadName || dadName || "Parent 1";
  const parent2Name = custodyParentOverride?.momName || momName || "Parent 2";
  const parent1Color = custodyParentOverride?.dadColor || custodyDadColor || dadColor || "blue";
  const parent2Color = custodyParentOverride?.momColor || custodyMomColor || momColor || "amber";
  const custodyScopeId = custodyGroupId || familyId;
  const householdScopeId = householdFamilyId || actualFamilyId || (custodyGroupId ? "" : familyId);
  const custodyScopeFields = useMemo(() => ({
    familyId: householdScopeId || custodyScopeId,
    custodyGroupId: custodyScopeId,
    householdFamilyId: householdScopeId || "",
    custodyGroupName:
      selectedCustodyGroup?.name ||
      custodyParentOverride?.custodyGroupName ||
      "",
    module: "budget",
    visibility: "custody_budget",
  }), [custodyScopeId, custodyParentOverride?.custodyGroupName, householdScopeId, selectedCustodyGroup?.name]);
  const canReadBudget = canReadModule(perms, "budget");
  const canWriteBudget = canWriteModule(perms, "budget");

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
    if (!user || !custodyScopeId || !canReadBudget) {
      setExpenses([]);
      setLoading(false);
      return () => {};
    }

    const collectionRef = collection(db, "custodyExpenses");
    const queries = [
      query(collectionRef, where("custodyGroupId", "==", custodyScopeId)),
      query(collectionRef, where("custody_group_id", "==", custodyScopeId)),
    ];

    const snapshots = new Map();
    const readyIndexes = new Set();
    let closed = false;

    setLoading(true);

    function emit() {
      if (closed || readyIndexes.size < queries.length) return;
      const docs = uniqueFirestoreDocsFromSnapshots(Array.from(snapshots.values()));
      setExpenses(sortExpenses(docs.map(normalizeExpenseDoc)));
      setLoading(false);
    }

    const unsubscribers = queries.map((expensesQuery, index) =>
      onSnapshot(
        expensesQuery,
        (snapshot) => {
          if (closed) return;
          readyIndexes.add(index);
          snapshots.set(index, snapshot);
          emit();
        },
        (error) => {
          console.warn(`Could not listen to custody expenses query ${index + 1}:`, error);
          readyIndexes.add(index);
          snapshots.set(index, { docs: [] });
          emit();
        }
      )
    );

    return () => {
      closed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user?.uid, custodyScopeId, canReadBudget]);

  const summary = useMemo(() => getBudgetSummary(expenses), [expenses]);

  const openAddExpense = () => {
    if (!canWriteBudget) {
      showNotice({
        title: "View-only budget",
        message: "You can review this custody budget, but you do not have permission to make changes.",
      });
      return;
    }

    setEditingExpense(null);
    setWizardOpen(true);
  };

  const openEditExpense = (expense) => {
    if (!canWriteBudget) {
      showNotice({
        title: "View-only budget",
        message: "You can review this custody budget, but you do not have permission to edit expenses.",
      });
      return;
    }

    setEditingExpense(expense);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setEditingExpense(null);
    setWizardOpen(false);
  };

  const refreshExpenseInState = (id, payload) => {
    setExpenses((current) =>
      sortExpenses(current.map((expense) => (
        expense.id === id
          ? normalizeExpenseData({ ...expense, ...payload }, id)
          : expense
      )))
    );

    setDetailExpense((current) =>
      current?.id === id
        ? normalizeExpenseData({ ...current, ...payload }, id)
        : current
    );
  };

  const showNotice = ({ tone = "warning", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const logBudgetActivity = (action, expense, focusedParent = "") => {
    if (!expense || !user?.uid || !custodyScopeFields.familyId) return;

    const ledger = getExpenseLedger(expense);
    queueFamilyActivity({
      familyId: custodyScopeFields.familyId,
      custodyScopeFields,
      user,
      profile,
      module: "custody",
      type: expenseActivityType(action),
      title: expenseActivityTitle(action, expense),
      description: expenseActivityDescription(action, expense, parent1Name, parent2Name, focusedParent),
      entityType: "custody_budget_expense",
      entityId: expense.id || "",
      date: expense.dueDate || "",
      metadata: {
        action,
        category: expense.category || "General",
        amount: ledger.amount,
        status: ledger.status,
        remainingTotal: ledger.remainingTotal,
        parent1Remaining: ledger.parent1Remaining,
        parent2Remaining: ledger.parent2Remaining,
        focusedParent,
      },
    });
  };

  const saveExpense = async (draftExpense) => {
    if (!user || !custodyScopeId || savingExpense || !canWriteBudget) return;

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
        ...custodyScopeFields,
      };

      if (editingExpense) {
        const result = await saveCustodyScopedRecordViaWorker({
          collectionName: "custodyExpenses",
          familyId: custodyScopeFields.familyId,
          custodyGroupId: custodyScopeId,
          record: { ...editingExpense, ...payload, id: editingExpense.id },
        });
        const updatedExpense = normalizeExpenseData(result?.record || { ...editingExpense, ...payload }, editingExpense.id);
        refreshExpenseInState(editingExpense.id, updatedExpense);
        logBudgetActivity("updated", updatedExpense);
      } else {
        const createPayload = {
          ...payload,
          createdBy: user.uid,
          created_by: user.uid,
          createdByEmail: user.email || "",
          created_by_email: user.email || "",
          order: expenses.length,
        };

        const result = await saveCustodyScopedRecordViaWorker({
          collectionName: "custodyExpenses",
          familyId: custodyScopeFields.familyId,
          custodyGroupId: custodyScopeId,
          record: createPayload,
        });
        const createdExpense = normalizeExpenseData(result?.record || createPayload, result?.recordId);
        setExpenses((current) => sortExpenses([
          ...current,
          createdExpense,
        ]));
        logBudgetActivity("created", createdExpense);
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
    if (!detailExpense || !user || !custodyScopeId || savingPayment || !canWriteBudget) return;

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
    };

    setSavingPayment(true);

    try {
      const result = await saveCustodyScopedRecordViaWorker({
        collectionName: "custodyExpenses",
        familyId: custodyScopeFields.familyId,
        custodyGroupId: custodyScopeId,
        record: { ...updatedExpense, ...payload, id: currentExpense.id, ...custodyScopeFields },
      });
      const savedExpense = normalizeExpenseData(result?.record || { ...updatedExpense, ...payload }, currentExpense.id);
      refreshExpenseInState(currentExpense.id, savedExpense);
      logBudgetActivity("payment", savedExpense, activeParentLedger);
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
    if (!detailExpense || !payment || !user || savingPayment || !canWriteBudget) return;

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
    };

    setSavingPayment(true);

    try {
      const result = await saveCustodyScopedRecordViaWorker({
        collectionName: "custodyExpenses",
        familyId: custodyScopeFields.familyId,
        custodyGroupId: custodyScopeId,
        record: { ...updatedExpense, ...payload, id: currentExpense.id, ...custodyScopeFields },
      });
      const savedExpense = normalizeExpenseData(result?.record || { ...updatedExpense, ...payload }, currentExpense.id);
      refreshExpenseInState(currentExpense.id, savedExpense);
      logBudgetActivity("payment_reversed", savedExpense, payment.parent);
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
    if (!detailExpense || !user || savingPayment || !canWriteBudget) return;

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
    };

    setSavingPayment(true);

    try {
      const result = await saveCustodyScopedRecordViaWorker({
        collectionName: "custodyExpenses",
        familyId: custodyScopeFields.familyId,
        custodyGroupId: custodyScopeId,
        record: { ...updatedExpense, ...payload, id: currentExpense.id, ...custodyScopeFields },
      });
      const savedExpense = normalizeExpenseData(result?.record || { ...updatedExpense, ...payload }, currentExpense.id);
      refreshExpenseInState(currentExpense.id, savedExpense);
      logBudgetActivity("review", savedExpense);
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
    if (!canWriteBudget) {
      showNotice({
        title: "View-only budget",
        message: "You can review this custody budget, but you do not have permission to delete expenses.",
      });
      return;
    }

    setDeleteCandidate(expenseToDelete);
  };

  const confirmDeleteExpense = async () => {
    if (!deleteCandidate || deletingExpense || !canWriteBudget) return;

    const expenseToDelete = deleteCandidate;
    const previousExpenses = expenses;

    setDeletingExpense(true);
    setExpenses((current) => current.filter((expense) => expense.id !== expenseToDelete.id));

    try {
      await deleteCustodyScopedRecordViaWorker({
        collectionName: "custodyExpenses",
        familyId: custodyScopeFields.familyId,
        custodyGroupId: custodyScopeId,
        recordId: expenseToDelete.id,
      });
      setDeleteCandidate(null);
      logBudgetActivity("deleted", expenseToDelete);
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

  if (!canReadBudget) {
    return (
      <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
        <Card className="mx-auto max-w-xl rounded-[2rem] border-white/80 bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Budget restricted</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">This custody budget is private</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            A custody group admin can grant budget access from the group permissions.
          </p>
        </Card>
      </div>
    );
  }

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
            helper={`${summary.partialCount} partial | ${summary.openCount} open | ${summary.reviewCount} review`}
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

              <Button type="button" onClick={openAddExpense} disabled={!canWriteBudget} className="rounded-full gap-2">
                <Plus className="h-4 w-4" />
                {canWriteBudget ? "Add expense" : "View only"}
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
                  canWrite={canWriteBudget}
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
          canWrite={canWriteBudget}
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
