import { useMemo, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";
import { addGoal, deleteGoal } from "../../services/transactionService";
import { formatRupee, summarizeTransactions } from "../../utils/categoryHelpers";

export default function GoalsPage() {
  const { user } = useAuth();
  const { items: goals } = useTransactions("goals");
  const { items: transactions } = useTransactions("transactions");
  const cycle = useSalaryCycleContext();
  const [form, setForm] = useState({ name: "", targetAmount: "", deadline: "" });
  const savings = useMemo(() => summarizeTransactions(transactions).savings, [transactions]);
  const survival = cycle.phase === "survival";

  async function submit(event) {
    event.preventDefault();
    await addGoal(user.uid, { ...form, targetAmount: Number(form.targetAmount), currentAmount: 0 });
    setForm({ name: "", targetAmount: "", deadline: "" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Goals</h1>
        {survival && <p className="mt-2 rounded-xl bg-red-400/10 p-3 text-red-100">Focus on getting to salary day first 🙏</p>}
      </div>
      <form onSubmit={submit} className={`card grid gap-3 md:grid-cols-[1fr_160px_180px_auto] ${survival ? "opacity-60" : ""}`}>
        <input className="input" placeholder="Goal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required disabled={survival} />
        <input className="input" type="number" min="1" placeholder="₹ target" value={form.targetAmount} onChange={(e) => setForm({ ...form, targetAmount: e.target.value })} required disabled={survival} />
        <input className="input" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} required disabled={survival} />
        <button className="btn-primary" disabled={survival}>Add Goal</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.length ? goals.map((goal) => {
          const current = Math.max(Number(goal.currentAmount || 0), Math.max(0, savings));
          const percent = Math.min(100, Math.round((current / Number(goal.targetAmount || 1)) * 100));
          const color = percent >= 70 ? "#4ade80" : percent >= 35 ? "#fb923c" : "#f87171";
          return (
            <section key={goal.id} className={`card ${survival ? "opacity-55 grayscale" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading text-xl font-bold">{goal.name}</h2>
                  <p className="text-sm text-paisa-muted">Deadline {goal.deadline}</p>
                </div>
                <button onClick={() => deleteGoal(user.uid, goal.id)} className="rounded-lg bg-red-400/10 px-3 py-2 text-sm font-bold text-red-200">Delete</button>
              </div>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#20202c]">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, background: color }} />
              </div>
              <p className="mt-3 text-sm text-paisa-muted">{formatRupee(current)} of {formatRupee(goal.targetAmount)} saved ({percent}%)</p>
            </section>
          );
        }) : <p className="card text-paisa-muted">No goals yet. Add one when your budget has breathing room.</p>}
      </div>
    </div>
  );
}
