export const initialCustodyExpenses = [
  {
    id: "daycare",
    title: "Daycare monthly payment",
    category: "School",
    amount: 1000,
    splitType: "50/50",
    parent1ShareAmount: 500,
    parent2ShareAmount: 500,
    parent1PaidAmount: 500,
    parent2PaidAmount: 0,
    status: "partial",
    due: "May 20",
    recurring: true,
  },
  {
    id: "soccer",
    title: "Soccer registration",
    category: "Activities",
    amount: 140,
    splitType: "50/50",
    parent1ShareAmount: 70,
    parent2ShareAmount: 70,
    parent1PaidAmount: 70,
    parent2PaidAmount: 70,
    status: "paid",
    due: "Paid",
    recurring: false,
  },
];

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

export function getBudgetSummary(expenses = initialCustodyExpenses) {
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
