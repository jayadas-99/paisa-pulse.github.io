import { update } from "firebase/database";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";
import { generateNudges } from "../../services/groqService";
import { saveNudges, userRef } from "../../services/transactionService";

const TYPE_STYLES = {
  warning: "bg-red-400/10 text-red-200",
  tip: "bg-blue-400/10 text-blue-200",
  achievement: "bg-green-400/10 text-green-200",
  insight: "bg-purple-400/10 text-purple-200",
};

export default function NudgesPage() {
  const { user } = useAuth();
  const { items: nudges } = useTransactions("nudges");
  const { items: transactions } = useTransactions("transactions");
  const { items: goals } = useTransactions("goals");
  const cycle = useSalaryCycleContext();
  const [busy, setBusy] = useState(false);

  const latest = [...nudges].sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0)).slice(0, 4);
  const lastUpdated = latest[0]?.generatedAt ? Math.max(1, Math.round((Date.now() - latest[0].generatedAt) / 60000)) : null;

  async function regenerate() {
    setBusy(true);
    const next = await generateNudges(transactions, goals, cycle);
    await saveNudges(user.uid, next, cycle.phase);
    setBusy(false);
  }

  async function markRead(id) {
    await update(userRef(user.uid, `nudges/${id}`), { isRead: true });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Nudges</h1>
          <p className="text-paisa-muted">Nudges for your {cycle.label} phase</p>
        </div>
        <button onClick={regenerate} className="btn-primary" disabled={busy}>{busy ? "Thinking..." : "Regenerate Nudges"}</button>
      </div>
      {lastUpdated && <p className="text-sm text-paisa-muted">Last updated {lastUpdated} mins ago</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {latest.length ? latest.map((nudge) => (
          <button key={nudge.id} onClick={() => markRead(nudge.id)} className={`card text-left transition hover:bg-paisa-hover ${!nudge.isRead ? "border-paisa-accentLight" : ""}`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <span className="text-3xl">{nudge.emoji || "💬"}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${TYPE_STYLES[nudge.type] || TYPE_STYLES.insight}`}>{nudge.type || "insight"}</span>
            </div>
            <h2 className="font-heading text-xl font-bold">{nudge.title}</h2>
            <p className="mt-3 text-paisa-muted">{nudge.message}</p>
          </button>
        )) : <p className="card text-paisa-muted">No nudges yet. Upload transactions or generate a fresh set.</p>}
      </div>
    </div>
  );
}
