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

export function getBudgetSummary(expenses = initialCustodyExpenses) {
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const pending = expenses
    .filter((expense) => expense.status !== "settled")
    .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const settled = total - pending;
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
  };
}
