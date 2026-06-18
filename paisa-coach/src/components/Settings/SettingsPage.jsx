import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { friendlyAuthError } from "../../utils/authErrors";
import { categorizeTransactions } from "../../services/groqService";
import { updateTransactions } from "../../services/transactionService";

export default function SettingsPage() {
  const { user, profile, updateUserProfile } = useAuth();
  const { items: transactions } = useTransactions("transactions");
  const { items: categoryRules } = useTransactions("categoryRules");
  const [form, setForm] = useState({ salaryDate: profile?.salaryDate || 1, monthlyIncome: profile?.monthlyIncome || "" });
  const [saved, setSaved] = useState(false);
  const [recategorized, setRecategorized] = useState(false);
  const [recategorizing, setRecategorizing] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaved(false);
    setError("");
    try {
      await updateUserProfile({ salaryDate: Number(form.salaryDate), monthlyIncome: Number(form.monthlyIncome) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }

  async function recategorizeSavedTransactions() {
    setError("");
    setRecategorized(false);
    setRecategorizing(true);
    try {
      const nextTransactions = await categorizeTransactions(transactions, { force: true, preferAi: true, userRules: categoryRules });
      await updateTransactions(user.uid, nextTransactions);
      setRecategorized(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setRecategorizing(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">Settings</h1>
      <form onSubmit={submit} className="card space-y-4">
        <label className="block text-sm font-bold text-paisa-muted">Salary credit date</label>
        <select className="input" value={form.salaryDate} onChange={(e) => setForm({ ...form, salaryDate: e.target.value })}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => <option key={day} value={day}>{day}</option>)}
        </select>
        <label className="block text-sm font-bold text-paisa-muted">Approx monthly income</label>
        <input className="input" type="number" min="0" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} />
        <button className="btn-primary">Save settings</button>
        {saved && <p className="text-sm text-green-200">Saved. Your salary cycle view is updated.</p>}
        {error && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      </form>
      <section className="card space-y-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Transaction categories</h2>
          <p className="mt-1 text-sm text-paisa-muted">Send saved merchant narrations to Groq and re-write categories with AI.</p>
        </div>
        <button onClick={recategorizeSavedTransactions} className="btn-secondary" disabled={recategorizing || !transactions.length}>
          {recategorizing ? "Asking Groq..." : `AI re-categorize ${transactions.length} transactions`}
        </button>
        {recategorized && <p className="text-sm text-green-200">Done. Dashboard and chat will use the updated categories.</p>}
      </section>
    </div>
  );
}
