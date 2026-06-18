import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CATEGORY_COLORS, formatRupee, groupExpensesByCategory, groupMoneyMovement } from "../../utils/categoryHelpers";

export default function CategoryBreakdown({ transactions }) {
  const grouped = groupExpensesByCategory(transactions);
  const movement = groupMoneyMovement(transactions);
  const total = Object.values(grouped).reduce((sum, value) => sum + value, 0);
  const data = Object.entries(grouped).map(([name, value]) => ({ name, value }));

  return (
    <section className="card">
      <h2 className="mb-5 font-heading text-xl font-bold">Category breakdown</h2>
      {data.length ? (
        <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={54} outerRadius={94} paddingAngle={3}>
                  {data.map((entry) => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || CATEGORY_COLORS.Other} />)}
                </Pie>
                <Tooltip formatter={(value) => formatRupee(value)} contentStyle={{ background: "#12121a", border: "1px solid #1e1e2e", borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: CATEGORY_COLORS[item.name] || CATEGORY_COLORS.Other }} />
                <span className="flex-1 font-bold">{item.name}</span>
                <span className="text-paisa-muted">{formatRupee(item.value)}</span>
                <span className="w-12 text-right text-sm text-paisa-muted">{Math.round((item.value / total) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : <p className="text-paisa-muted">Upload a statement to see where the money is flowing.</p>}
      {Object.keys(movement).length > 0 && (
        <div className="mt-5 rounded-xl border border-paisa-border bg-paisa-hover p-4">
          <p className="mb-3 text-sm font-bold text-paisa-muted">Moved out, not daily spend</p>
          <div className="space-y-2">
            {Object.entries(movement).map(([name, value]) => (
              <div key={name} className="flex justify-between text-sm">
                <span>{name}</span>
                <strong>{formatRupee(value)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
