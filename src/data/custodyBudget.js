export const initialCustodyExpenses = [
  {
    id: "daycare",
    title: "Daycare monthly payment",
    category: "School",
    amount: 850,
    paidBy: "Dad",
    split: "50/50",
    status: "pending",
    due: "May 20",
    recurring: true,
  },
  {
    id: "soccer",
    title: "Soccer registration",
    category: "Activities",
    amount: 140,
    paidBy: "Mom",
    split: "50/50",
    status: "settled",
    due: "Paid",
    recurring: false,
  },
  {
    id: "medicine",
    title: "Prescription refill",
    category: "Medical",
    amount: 38,
    paidBy: "Dad",
    split: "50/50",
    status: "review",
    due: "May 18",
    recurring: false,
  },
  {
    id: "school-supplies",
    title: "School supplies",
    category: "School",
    amount: 62,
    paidBy: "Shared",
    split: "Custom",
    status: "pending",
    due: "May 22",
    recurring: false,
  },
];

export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function normalizePaidBy(value) {
  const paidBy = String(value || "").trim().toLowerCase();

  if (paidBy === "dad" || paidBy === "father" || paidBy === "parent 1") return "dad";
  if (paidBy === "mom" || paidBy === "mother" || paidBy === "parent 2") return "mom";

  return "shared";
}

function getSplitShares(expense) {
  const split = String(expense?.split || "50/50").trim().toLowerCase();

  if (split === "50/50" || split === "default") {
    return { dadShare: 0.5, momShare: 0.5 };
  }

  return { dadShare: 0.5, momShare: 0.5 };
}

export function getBudgetSummary(expenses = initialCustodyExpenses) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const pendingExpenses = expenses.filter((expense) => expense.status !== "settled");

  const pending = pendingExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const settled = total - pending;

  const balances = pendingExpenses.reduce(
    (acc, expense) => {
      const amount = Number(expense.amount || 0);
      const paidBy = normalizePaidBy(expense.paidBy);
      const split = String(expense?.split || "50/50").trim().toLowerCase();

      if (!amount || amount <= 0 || paidBy === "shared" || split !== "50/50") {
        acc.excludedCount += 1;
        acc.excludedAmount += amount || 0;
        return acc;
      }

      const { dadShare, momShare } = getSplitShares(expense);

      if (paidBy === "dad") {
        acc.momOwesDad += amount * momShare;
      }

      if (paidBy === "mom") {
        acc.dadOwesMom += amount * dadShare;
      }

      return acc;
    },
    { dadOwesMom: 0, momOwesDad: 0, excludedCount: 0, excludedAmount: 0 }
  );

  const netDadOwesMom = Math.max(0, balances.dadOwesMom - balances.momOwesDad);
  const netMomOwesDad = Math.max(0, balances.momOwesDad - balances.dadOwesMom);

  const reviewCount = expenses.filter((expense) => expense.status === "review").length;
  const pendingCount = expenses.filter((expense) => expense.status === "pending").length;
  const settledCount = expenses.filter((expense) => expense.status === "settled").length;

  return {
    total,
    pending,
    settled,
    reviewCount,
    pendingCount,
    settledCount,
    totalCount: expenses.length,
    dadOwesMom: Math.round(netDadOwesMom),
    momOwesDad: Math.round(netMomOwesDad),
    grossDadOwesMom: Math.round(balances.dadOwesMom),
    grossMomOwesDad: Math.round(balances.momOwesDad),
    excludedReimbursementCount: balances.excludedCount,
    excludedReimbursementAmount: Math.round(balances.excludedAmount),
  };
}
