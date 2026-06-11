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

export function normalizePulseCategory(category) {
  if (category === "Food Delivery") return "Food";
  if (category === "Quick Commerce") return "Groceries";
  if (category === "Bills") return "Subscriptions";
  return category || "Other";
}

export function inferPulseCategory(transaction = {}) {
  const text = [transaction.description, transaction.merchant, transaction.merchantRaw, transaction.rawLine]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/zepto|zeptonow|zptmktp|blinkit|instamart|swiggyinstamart|swiggy\.?stores|bigbasket|bbdaily|jiomart|dmart|grocery|groceries|quick commerce/.test(text)) return "Groceries";
  if (/swiggy|zomato|dominos|pizza|kfc|mcdonald|burger|restaurant|food|eatclub|faasos|behrouz|box8/.test(text)) return "Food";
  if (/netflix|spotify|hotstar|prime|subscription|autopay|mandate|recurring|airtel|jio|vi\.|vil\.|vodafone|policybazaar|gpayrecharge|gpay-utility|broadband|bill|sms charges|youtube|google|apple|icloud|standing instruction|si-|nach|ach/.test(text)) return "Subscriptions";

  return normalizePulseCategory(transaction.category);
}

export function finalPulseCategory(transaction = {}) {
  const savedCategory = normalizePulseCategory(transaction.category);
  if (["Food", "Groceries", "Subscriptions"].includes(savedCategory)) return savedCategory;
  return inferPulseCategory(transaction);
}

export function pulseCategoryMatches(transaction = {}, categories = []) {
  return categories.includes(normalizePulseCategory(transaction.category))
    || categories.includes(finalPulseCategory(transaction));
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

export function parseTransactionDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value || "").trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const statementMatch = text.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);

  let year;
  let month;
  let day;

  if (isoMatch) {
    [, year, month, day] = isoMatch.map(Number);
  } else if (statementMatch) {
    [, day, month, year] = statementMatch.map(Number);
  } else {
    return null;
  }

  const maxYear = new Date().getFullYear() + 1;
  if (year < 2000 || year > maxYear || month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function monthKey(dateString) {
  const date = parseTransactionDate(dateString);
  if (!date) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function summarizeTransactions(transactions = []) {
  const spent = transactions.filter((tx) => tx.amount < 0).reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const income = transactions.filter((tx) => tx.amount > 0).reduce((sum, tx) => sum + Number(tx.amount), 0);
  return { spent, income, savings: income - spent };
}
