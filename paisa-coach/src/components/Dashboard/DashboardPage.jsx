import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useTransactions } from "../../hooks/useTransactions";
import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";
import { formatRupee, groupExpensesByCategory, monthKey, summarizeTransactions } from "../../utils/categoryHelpers";
import { getCurrentMonthKey } from "../../utils/salaryCycleUtils";
import SpendingOverview from "./SpendingOverview";
import CategoryBreakdown from "./CategoryBreakdown";
import MonthComparison from "./MonthComparison";
import MoneyInsights from "./MoneyInsights";
import { useAuth } from "../../hooks/useAuth";

export default function DashboardPage() {
  const { items: transactions } = useTransactions("transactions");
  const { profile } = useAuth();
  const cycle = useSalaryCycleContext();
  const location = useLocation();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const availableMonths = useMemo(() => [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort().reverse(), [transactions]);
  const monthTransactions = useMemo(() => transactions.filter((tx) => monthKey(tx.date) === selectedMonth), [transactions, selectedMonth]);

  useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  if (cycle?.phase === "survival") {
    const summary = summarizeTransactions(monthTransactions);
    const remaining = Math.max((cycle.monthlyIncome || summary.income) - summary.spent, 0);
    const essentials = Object.entries(groupExpensesByCategory(monthTransactions))
      .filter(([cat]) => ["Bills", "Groceries", "Transport", "Health"].includes(cat))
      .sort((a, b) => b[1] - a[1]);
    return (
      <div className="space-y-6">
        <section className="card border-red-400/30 bg-red-400/5">
          <p className="text-sm font-bold text-red-200">Money remaining this month</p>
          <h1 className="mt-2 font-heading text-5xl font-extrabold">{formatRupee(remaining)}</h1>
          <p className="mt-3 text-paisa-muted">{cycle.daysUntilNext} days to go. You've got this 💪</p>
        </section>
        <section className="card">
          <h2 className="mb-4 font-heading text-xl font-bold">Essential categories only</h2>
          {essentials.length ? essentials.map(([cat, value]) => (
            <div key={cat} className="mb-3 flex justify-between rounded-xl bg-[#0f0f16] p-4">
              <span>{cat}</span><strong>{formatRupee(value)}</strong>
            </div>
          )) : <p className="text-paisa-muted">No essential spending logged yet for this month.</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Dashboard</h1>
          <p className="text-paisa-muted">Salary-cycle-aware money view, minus the judgement.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/transactions" className="rounded-lg border border-paisa-border px-4 py-3 text-sm font-bold hover:bg-paisa-hover">🧾 Review Transactions</Link>
        </div>
      </div>
      {location.state?.toast && <p className="rounded-xl bg-green-400/10 p-4 font-bold text-green-200">{location.state.toast}</p>}
      <SpendingOverview transactions={transactions} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} months={availableMonths} />
      <MoneyInsights transactions={transactions} selectedMonth={selectedMonth} monthlyIncome={profile?.monthlyIncome} />
      <div className="grid gap-6 xl:grid-cols-2">
        <CategoryBreakdown transactions={monthTransactions} />
      </div>
      <MonthComparison transactions={transactions} selectedMonth={selectedMonth} />
    </div>
  );
}
