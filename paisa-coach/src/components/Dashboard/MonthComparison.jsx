import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CATEGORIES, formatRupee, groupExpensesByCategory, monthKey } from "../../utils/categoryHelpers";

export default function MonthComparison({ transactions, selectedMonth }) {
  const currentDate = new Date(`${selectedMonth}-01`);
  const lastDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const lastMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, "0")}`;
  const current = groupExpensesByCategory(transactions.filter((tx) => monthKey(tx.date) === selectedMonth));
  const last = groupExpensesByCategory(transactions.filter((tx) => monthKey(tx.date) === lastMonth));
  const data = CATEGORIES.filter((cat) => !["Income", "Salary"].includes(cat)).map((category) => ({
    category,
    thisMonth: current[category] || 0,
    lastMonth: last[category] || 0,
    increased: (current[category] || 0) > (last[category] || 0) * 1.2 && (last[category] || 0) > 0,
  })).filter((row) => row.thisMonth || row.lastMonth);

  return (
    <section className="card">
      <h2 className="mb-5 font-heading text-xl font-bold">This month vs last month</h2>
      {data.length ? (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid stroke="#1e1e2e" />
                <XAxis dataKey="category" stroke="#8b8ba3" fontSize={12} />
                <YAxis stroke="#8b8ba3" fontSize={12} />
                <Tooltip formatter={(value) => formatRupee(value)} contentStyle={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10 }} />
                <Bar dataKey="lastMonth" fill="#3b3b4f" name="Last month" radius={[6, 6, 0, 0]} />
                <Bar dataKey="thisMonth" fill="#7c3aed" name="This month" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.filter((row) => row.increased).map((row) => <span key={row.category} className="rounded-full bg-red-400/10 px-3 py-1 text-xs font-bold text-red-200">{row.category} up 20%+</span>)}
          </div>
        </>
      ) : <p className="text-paisa-muted">Upload at least one month of transactions to compare.</p>}
    </section>
  );
}
