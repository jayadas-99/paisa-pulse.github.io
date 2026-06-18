import { formatRupee, monthKey, summarizeTransactions } from "../../utils/categoryHelpers";

export default function SpendingOverview({ transactions, selectedMonth, onMonthChange, months }) {
  const summary = summarizeTransactions(transactions.filter((tx) => monthKey(tx.date) === selectedMonth));

  return (
    <section className="card">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">This month's money</h2>
        <select className="input max-w-[160px]" value={selectedMonth} onChange={(e) => onMonthChange(e.target.value)}>
          {(months.length ? months : [selectedMonth]).map((month) => <option key={month} value={month}>{month}</option>)}
        </select>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Spent" value={formatRupee(summary.spent)} tone="text-red-200" />
        <Metric label="Income" value={formatRupee(summary.income)} tone="text-green-200" />
        <Metric label="Net savings" value={formatRupee(summary.savings)} tone={summary.savings >= 0 ? "text-green-200" : "text-red-200"} />
      </div>
    </section>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-paisa-border bg-[#0f0f16] p-4">
      <p className="text-sm text-paisa-muted">{label}</p>
      <p className={`mt-2 font-heading text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
