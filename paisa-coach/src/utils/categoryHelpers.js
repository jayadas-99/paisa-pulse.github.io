export const CATEGORIES = ["Food", "Groceries", "Transport", "Shopping", "Entertainment", "Bills", "Rent", "Household", "Personal Care", "Health", "Travel", "Education", "Transfers", "Savings", "Salary", "Income", "Other"];

export const CATEGORY_COLORS = {
  Food: "#fb923c",
  Transport: "#60a5fa",
  Groceries: "#4ade80",
  Entertainment: "#a78bfa",
  Bills: "#f87171",
  Rent: "#fb7185",
  Household: "#f59e0b",
  "Personal Care": "#ec4899",
  Health: "#f9a8d4",
  Travel: "#facc15",
  Shopping: "#e5e7eb",
  Education: "#38bdf8",
  Transfers: "#c084fc",
  Savings: "#2dd4bf",
  Salary: "#86efac",
  Income: "#22c55e",
  Other: "#94a3b8",
};

export function formatRupee(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function expenseAmount(transaction) {
  return Math.abs(Math.min(Number(transaction.amount || 0), 0));
}

export function groupExpensesByCategory(transactions = []) {
  return transactions
    .filter((tx) => Number(tx.amount) < 0 && !["Income", "Salary", "Transfers", "Savings"].includes(tx.category))
    .reduce((acc, tx) => {
      const category = tx.category || "Other";
      acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount));
      return acc;
    }, {});
}

export function groupMoneyMovement(transactions = []) {
  return transactions
    .filter((tx) => Number(tx.amount) < 0 && ["Transfers", "Savings"].includes(tx.category))
    .reduce((acc, tx) => {
      const category = tx.category || "Transfers";
      acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount));
      return acc;
    }, {});
}

export function monthKey(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function summarizeTransactions(transactions = []) {
  const spent = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + Number(tx.amount), 0);
  return { spent, income, savings: income - spent };
}
