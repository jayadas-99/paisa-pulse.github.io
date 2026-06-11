import { useMemo } from "react";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { formatRupee } from "../../utils/pulseCategoryHelpers";

function monthsAgo(count) {
  const date = new Date();
  date.setMonth(date.getMonth() - count);
  return date;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SubscriptionAudit() {
  const { items: transactions } = usePulseTransactions("transactions");
  const subscriptionRows = useMemo(() => {
    const cutoff = monthsAgo(3);
    const grouped = transactions
      .filter((tx) => Number(tx.amount) < 0 && ["Bills", "Subscriptions"].includes(tx.category))
      .reduce((acc, tx) => {
        const merchant = tx.merchant || tx.description || "Unknown merchant";
        const current = acc.get(merchant) || { merchant, dates: [], recentCount: 0, total: 0 };
        const date = new Date(tx.date);
        current.dates.push(date);
        current.total += Math.abs(Number(tx.amount || 0));
        if (!Number.isNaN(date.getTime()) && date >= cutoff) current.recentCount += 1;
        acc.set(merchant, current);
        return acc;
      }, new Map());

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        lastDate: item.dates.sort((a, b) => b - a)[0],
        monthlyAverage: item.total / 3,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Subscription Audit 📋</h1>
        <p className="text-paisa-muted">These are the recurring charges we detected</p>
      </div>
      {subscriptionRows.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {subscriptionRows.map((item) => (
            <section key={item.merchant} className="card">
              <h2 className="font-heading text-xl font-bold">{item.merchant}</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-paisa-tag p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Last charged</p>
                  <p className="mt-1 font-bold">{formatDate(item.lastDate)}</p>
                </div>
                <div className="rounded-xl bg-paisa-tag p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Last 3 months</p>
                  <p className="mt-1 font-bold">{item.recentCount} charges</p>
                </div>
                <div className="rounded-xl bg-paisa-tag p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Total spent</p>
                  <p className="mt-1 font-bold">{formatRupee(item.total)}</p>
                </div>
                <div className="rounded-xl bg-paisa-tag p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Monthly average</p>
                  <p className="mt-1 font-bold">{formatRupee(item.monthlyAverage)}</p>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="card">
          <p className="text-paisa-muted">No subscriptions detected yet. Upload a statement first.</p>
        </section>
      )}
    </div>
  );
}
