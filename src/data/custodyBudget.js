export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function money(value) {
  const number = Number(value || 0);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100) / 100;
}

function hasExplicitLedgerFields(expense = {}) {
  return (
    expense.parent1ShareAmount !== undefined ||
    expense.parent2ShareAmount !== undefined ||
    expense.parent1PaidAmount !== undefined ||
    expense.parent2PaidAmount !== undefined
  );
}

function normalizeLegacyPaidBy(value) {
  const paidBy = String(value || "").trim().toLowerCase();

  if (paidBy === "dad" || paidBy === "father" || paidBy === "parent 1") return "parent1";
  if (paidBy === "mom" || paidBy === "mother" || paidBy === "parent 2") return "parent2";

  return "shared";
}

export function getExpenseLedger(expense = {}) {
  const amount = money(expense.amount);
  const splitType = String(expense.splitType || expense.split || "50/50").trim();

  let parent1ShareAmount = money(expense.parent1ShareAmount);
  let parent2ShareAmount = money(expense.parent2ShareAmount);

  if (!parent1ShareAmount && !parent2ShareAmount) {
    if (splitType === "Parent 1 pays" || splitType === "Dad pays") {
      parent1ShareAmount = amount;
      parent2ShareAmount = 0;
    } else if (splitType === "Parent 2 pays" || splitType === "Mom pays") {
      parent1ShareAmount = 0;
      parent2ShareAmount = amount;
    } else {
      parent1ShareAmount = money(amount / 2);
      parent2ShareAmount = money(amount - parent1ShareAmount);
    }
  }

  let parent1PaidAmount = money(expense.parent1PaidAmount);
  let parent2PaidAmount = money(expense.parent2PaidAmount);

  if (!hasExplicitLedgerFields(expense)) {
    if (expense.status === "settled" || expense.status === "paid") {
      parent1PaidAmount = parent1ShareAmount;
      parent2PaidAmount = parent2ShareAmount;
    } else {
      const legacyPaidBy = normalizeLegacyPaidBy(expense.paidBy);

      if (legacyPaidBy === "parent1") parent1PaidAmount = amount;
      if (legacyPaidBy === "parent2") parent2PaidAmount = amount;
    }
  }

  const parent1Remaining = money(Math.max(parent1ShareAmount - parent1PaidAmount, 0));
  const parent2Remaining = money(Math.max(parent2ShareAmount - parent2PaidAmount, 0));

  const parent1Overpaid = money(Math.max(parent1PaidAmount - parent1ShareAmount, 0));
  const parent2Overpaid = money(Math.max(parent2PaidAmount - parent2ShareAmount, 0));

  const validationErrors = [];
  const reviewFlag = Boolean(expense.reviewFlag);

  if (amount <= 0) validationErrors.push("Amount must be greater than $0.");

  const shareTotal = money(parent1ShareAmount + parent2ShareAmount);
  if (amount > 0 && Math.abs(shareTotal - amount) > 0.01) {
    validationErrors.push("Parent shares must add up to the total expense amount.");
  }

  if (parent1ShareAmount < 0 || parent2ShareAmount < 0) {
    validationErrors.push("Share amounts cannot be negative.");
  }

  if (parent1PaidAmount < 0 || parent2PaidAmount < 0) {
    validationErrors.push("Paid amounts cannot be negative.");
  }

  let status = "open";
  const paidTotal = money(parent1PaidAmount + parent2PaidAmount);
  const remainingTotal = money(parent1Remaining + parent2Remaining);

  if (validationErrors.length || reviewFlag) {
    status = "review";
  } else if (remainingTotal === 0) {
    status = "paid";
  } else if (paidTotal > 0) {
    status = "partial";
  }

  return {
    amount,
    splitType,
    parent1ShareAmount,
    parent2ShareAmount,
    parent1PaidAmount,
    parent2PaidAmount,
    parent1Remaining,
    parent2Remaining,
    parent1Overpaid,
    parent2Overpaid,
    paidTotal,
    remainingTotal,
    status,
    reviewFlag,
    validationErrors,
  };
}

export function validateExpenseLedger(expense = {}) {
  return getExpenseLedger(expense).validationErrors;
}

export function getBudgetSummary(expenses = []) {
  const ledgers = expenses.map((expense) => getExpenseLedger(expense));

  const total = ledgers.reduce((sum, ledger) => sum + ledger.amount, 0);
  const paid = ledgers.reduce((sum, ledger) => sum + ledger.paidTotal, 0);
  const remaining = ledgers.reduce((sum, ledger) => sum + ledger.remainingTotal, 0);

  const parent1ShouldPay = ledgers.reduce((sum, ledger) => sum + ledger.parent1ShareAmount, 0);
  const parent2ShouldPay = ledgers.reduce((sum, ledger) => sum + ledger.parent2ShareAmount, 0);

  const parent1Paid = ledgers.reduce((sum, ledger) => sum + ledger.parent1PaidAmount, 0);
  const parent2Paid = ledgers.reduce((sum, ledger) => sum + ledger.parent2PaidAmount, 0);

  const parent1Remaining = ledgers.reduce((sum, ledger) => sum + ledger.parent1Remaining, 0);
  const parent2Remaining = ledgers.reduce((sum, ledger) => sum + ledger.parent2Remaining, 0);

  const parent1Overpaid = ledgers.reduce((sum, ledger) => sum + ledger.parent1Overpaid, 0);
  const parent2Overpaid = ledgers.reduce((sum, ledger) => sum + ledger.parent2Overpaid, 0);

  return {
    total,
    paid,
    pending: remaining,
    remaining,
    settled: paid,
    totalCount: expenses.length,
    openCount: ledgers.filter((ledger) => ledger.status === "open").length,
    partialCount: ledgers.filter((ledger) => ledger.status === "partial").length,
    paidCount: ledgers.filter((ledger) => ledger.status === "paid").length,
    reviewCount: ledgers.filter((ledger) => ledger.status === "review").length,
    parent1ShouldPay,
    parent2ShouldPay,
    parent1Paid,
    parent2Paid,
    parent1Remaining,
    parent2Remaining,
    parent1Overpaid,
    parent2Overpaid,
  };
}


export function getExpenseDueStatus(expense = {}, ledger = getExpenseLedger(expense), now = new Date()) {
  if (ledger.remainingTotal <= 0) {
    return {
      status: "paid",
      label: "Paid",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      daysUntilDue: null,
    };
  }

  let dueDateValue = expense.dueDate || "";

  if (!dueDateValue && expense.recurring && expense.dueDayOfMonth) {
    const day = Number(expense.dueDayOfMonth);
    if (day >= 1 && day <= 31) {
      const year = now.getFullYear();
      const month = now.getMonth();
      const candidate = new Date(year, month, day);
      dueDateValue = candidate.toISOString().slice(0, 10);
    }
  }

  if (!dueDateValue) {
    return {
      status: "none",
      label: "No due date",
      className: "border-slate-200 bg-slate-50 text-slate-600",
      daysUntilDue: null,
    };
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(`${dueDateValue}T12:00:00`);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const daysUntilDue = Math.round((dueDay - today) / 86400000);

  if (daysUntilDue < 0) {
    return {
      status: "overdue",
      label: `Overdue by ${Math.abs(daysUntilDue)}d`,
      className: "border-rose-200 bg-rose-50 text-rose-700",
      daysUntilDue,
    };
  }

  if (daysUntilDue <= 3) {
    return {
      status: "due_soon",
      label: daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue}d`,
      className: "border-amber-200 bg-amber-50 text-amber-700",
      daysUntilDue,
    };
  }

  return {
    status: "scheduled",
    label: `Due in ${daysUntilDue}d`,
    className: "border-blue-200 bg-blue-50 text-blue-700",
    daysUntilDue,
  };
}
