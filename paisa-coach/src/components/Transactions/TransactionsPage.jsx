import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTransactions } from "../../hooks/useTransactions";
import { getCurrentMonthKey } from "../../utils/salaryCycleUtils";
import { monthKey } from "../../utils/categoryHelpers";
import RecentTransactions from "../Dashboard/RecentTransactions";
import TransferBreakdown from "./TransferBreakdown";

export default function TransactionsPage() {
  const { items: transactions } = useTransactions("transactions");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const availableMonths = useMemo(() => (
    [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort().reverse()
  ), [transactions]);
  const monthTransactions = useMemo(() => (
    transactions.filter((tx) => monthKey(tx.date) === selectedMonth)
  ), [transactions, selectedMonth]);

  useEffect(() => {
    if (availableMonths.length && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Transactions</h1>
          <p className="text-paisa-muted">Review merchant names, fix categories, and refresh one batch at a time.</p>
        </div>
        <Link to="/upload" className="btn-primary">📤 Upload more</Link>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Statement month</h2>
            <p className="text-sm text-paisa-muted">{monthTransactions.length} transactions in this view</p>
          </div>
          <select className="input max-w-[180px]" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {(availableMonths.length ? availableMonths : [selectedMonth]).map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>
        </div>
      </section>

      <TransferBreakdown transactions={monthTransactions} />
      <RecentTransactions transactions={monthTransactions} pageSize={15} collapsible defaultExpanded />
    </div>
  );
}
