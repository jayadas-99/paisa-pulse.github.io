import { formatRupee, monthKey } from "../../utils/categoryHelpers";

const AVOIDABLE = ["Food", "Shopping", "Entertainment", "Personal Care"];
const FIXED = ["Bills", "Rent", "Household"];

function daysLeftInMonth(month) {
  const now = new Date();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  if (month !== current) return 0;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(last - now.getDate() + 1, 1);
}

export function detectRecurringBills(transactions = []) {
  const groups = transactions
    .filter((tx) => Number(tx.amount) < 0 && FIXED.includes(tx.category))
    .reduce((acc, tx) => {
      const key = (tx.merchant || tx.description || "Bill").toLowerCase().replace(/\d+/g, "").slice(0, 42);
      const date = new Date(tx.date);
      const current = acc[key] || { name: tx.merchant || tx.description || "Bill", total: 0, count: 0, days: [] };
      current.total += Math.abs(Number(tx.amount));
      current.count += 1;
      current.days.push(date.getDate());
      acc[key] = current;
      return acc;
    }, {});

  return Object.values(groups)
    .map((item) => ({
      ...item,
      avgAmount: item.total / item.count,
      avgDay: Math.round(item.days.reduce((sum, day) => sum + day, 0) / item.days.length),
    }))
    .sort((a, b) => b.avgAmount - a.avgAmount)
    .slice(0, 4);
}

export default function MoneyInsights({ transactions, selectedMonth, monthlyIncome }) {
  const monthTransactions = transactions.filter((tx) => monthKey(tx.date) === selectedMonth);
  const expenses = monthTransactions.filter((tx) => Number(tx.amount) < 0);
  const income = monthTransactions.filter((tx) => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0);
  const spent = expenses.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  const avoidable = expenses
    .filter((tx) => AVOIDABLE.includes(tx.category))
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  const avoidablePct = spent ? Math.round((avoidable / spent) * 100) : 0;
  const remaining = Math.max((monthlyIncome || income) - spent, 0);
  const safePerDay = daysLeftInMonth(selectedMonth) ? remaining / daysLeftInMonth(selectedMonth) : 0;
  const recurring = detectRecurringBills(transactions);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <Insight title="Safe to spend" value={safePerDay ? `${formatRupee(safePerDay)}/day` : "Past month"} detail={`${formatRupee(remaining)} left after logged spends`} />
      <Insight title="Avoidable spend" value={`${formatRupee(avoidable)}`} detail={`${avoidablePct}% of spending across food, shopping, entertainment, personal care`} />
      <div className="card">
        <h2 className="font-heading text-lg font-bold">Recurring bills spotted</h2>
        {recurring.length ? (
          <div className="mt-4 space-y-3">
            {recurring.map((item) => (
              <div key={item.name} className="flex justify-between gap-3 text-sm">
                <span className="truncate">{item.name}</span>
                <span className="font-bold">{formatRupee(item.avgAmount)} · day {item.avgDay}</span>
              </div>
            ))}
          </div>
        ) : <p className="mt-3 text-sm text-paisa-muted">Upload 2+ months for stronger recurring detection.</p>}
      </div>
    </section>
  );
}

function Insight({ title, value, detail }) {
  return (
    <div className="card">
      <p className="text-sm font-bold text-paisa-muted">{title}</p>
      <p className="mt-3 font-heading text-3xl font-extrabold">{value}</p>
      <p className="mt-2 text-sm text-paisa-muted">{detail}</p>
    </div>
  );
}
