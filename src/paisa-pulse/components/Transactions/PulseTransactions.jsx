import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { finalPulseCategory, formatRupee, monthKey, pulseCategoryMatches } from "../../utils/pulseCategoryHelpers";
import { getCurrentMonthKey } from "../../utils/pulseSalaryCycleUtils";

function categoryMatches(transaction, filter) {
  if (!filter) return true;
  if (filter === "Food") return pulseCategoryMatches(transaction, ["Food", "Food Delivery"]);
  if (filter === "Groceries") return pulseCategoryMatches(transaction, ["Groceries", "Quick Commerce"]);
  if (filter === "Subscriptions") return pulseCategoryMatches(transaction, ["Bills", "Subscriptions"]);
  return transaction.category === filter;
}

export default function PulseTransactions() {
  const { search } = useLocation();
  const category = new URLSearchParams(search).get("category") || "";
  const { items: transactions } = usePulseTransactions("transactions");
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const months = useMemo(() => (
    [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort().reverse()
  ), [transactions]);
  useEffect(() => {
    if (months.length && !months.includes(selectedMonth)) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);
  const visibleTransactions = useMemo(() => (
    transactions
      .filter((tx) => monthKey(tx.date) === selectedMonth)
      .filter((tx) => Number(tx.amount) < 0)
      .filter((tx) => categoryMatches(tx, category))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
  ), [transactions, selectedMonth, category]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Pulse Transactions</h1>
          <p className="text-paisa-muted">{category ? `${category} transactions` : "Food, quick commerce, and subscription spend"}</p>
        </div>
        <Link to="/pulse/upload" className="btn-primary">📤 Upload statement</Link>
      </div>
      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-paisa-muted">{visibleTransactions.length} transactions in this view</p>
          <select className="input max-w-[180px]" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
            {(months.length ? months : [selectedMonth]).map((month) => <option key={month} value={month}>{month}</option>)}
          </select>
        </div>
      </section>
      <section className="card overflow-x-auto">
        {visibleTransactions.length ? (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="text-paisa-muted">
              <tr><th className="py-2">Date</th><th>Description</th><th>Category</th><th>Merchant</th><th className="text-right">Amount</th></tr>
            </thead>
            <tbody>
              {visibleTransactions.map((tx) => (
                <tr key={tx.id} className="border-t border-paisa-border">
                  <td className="py-3">{tx.date}</td>
                  <td>{tx.description}</td>
                  <td>{finalPulseCategory(tx)}</td>
                  <td>{tx.merchant || "Unknown"}</td>
                  <td className="text-right font-bold">{formatRupee(Math.abs(Number(tx.amount || 0)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-paisa-muted">No matching transactions yet.</p>
        )}
      </section>
    </div>
  );
}
