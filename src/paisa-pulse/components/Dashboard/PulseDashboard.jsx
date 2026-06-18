import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import html2canvas from "html2canvas";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { usePulseSalaryCycleContext } from "../Shared/PulseSalaryCycleContext";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { formatRupee, monthKey, pulseCategoryMatches } from "../../utils/pulseCategoryHelpers";
import { getCurrentMonthKey } from "../../utils/pulseSalaryCycleUtils";
import { generatePulseNudges } from "../../services/pulseGroq";

const CATEGORIES = [
  {
    key: "foodDelivery",
    emoji: "🍔",
    name: "Food Delivery",
    categories: ["Food", "Food Delivery"],
    query: "Food",
  },
  {
    key: "quickCommerce",
    emoji: "🛒",
    name: "Quick Commerce",
    categories: ["Groceries", "Quick Commerce"],
    query: "Groceries",
  },
  {
    key: "subscriptions",
    emoji: "📱",
    name: "Subscriptions",
    categories: ["Bills", "Subscriptions"],
    query: "Subscriptions",
  },
];

function lastMonthKey(currentMonth) {
  const date = new Date(`${currentMonth}-01`);
  date.setMonth(date.getMonth() - 1);
  return getCurrentMonthKey(date);
}

function totalFor(transactions, categories, targetMonth) {
  return transactions
    .filter((tx) => Number(tx.amount) < 0 && pulseCategoryMatches(tx, categories) && monthKey(tx.date) === targetMonth)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
}

function latestTransactionMonth(transactions = []) {
  const months = [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort();
  return months.at(-1) || getCurrentMonthKey();
}

function trendFor(current, previous) {
  if (current > previous) return { icon: "↑", className: "text-paisa-accentLight", label: `${formatRupee(current - previous)} vs last month` };
  if (current < previous) return { icon: "↓", className: "text-paisa-accent", label: `${formatRupee(previous - current)} vs last month` };
  return { icon: "→", className: "text-paisa-muted", label: "same as last month" };
}

function budgetColor(percent) {
  if (percent > 90) return "bg-paisa-accentLight";
  if (percent >= 70) return "bg-paisa-accent";
  return "bg-paisa-muted";
}

async function generateCardInsight(foodTotal, foodPrev, quickTotal, quickPrev, subTotal, subPrev) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: "You are a finance insight generator for an Indian personal finance app.\nGiven this month vs last month totals for Food Delivery, Quick Commerce, and Subscriptions,\nwrite ONE sentence (max 18 words) that highlights the most notable change.\nBe specific — use the actual rupee numbers. Non-judgmental tone.\nReturn only the sentence, no punctuation at the end, no quotes.",
        },
        {
          role: "user",
          content: JSON.stringify({ foodTotal, foodPrev, quickTotal, quickPrev, subTotal, subPrev }),
        },
      ],
      temperature: 0.2,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || data?.error || "Could not generate insight");
  return String(data.choices?.[0]?.message?.content || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[.!?]$/g, "")
    .trim();
}

function PulseCategoryCard({ card, total, previous, budget, nudge }) {
  const trend = trendFor(total, previous);
  const budgetPercent = budget > 0 ? Math.min(Math.round((total / budget) * 100), 100) : 0;

  return (
    <section className="card">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-heading text-xl font-bold">{card.emoji} {card.name}</h2>
        <span className={`text-sm font-extrabold ${trend.className}`}>{trend.icon}</span>
      </div>
      <p className="mt-5 text-sm text-paisa-muted">This month</p>
      <p className="font-heading text-3xl font-extrabold">{formatRupee(total)}</p>
      <p className={`mt-2 text-sm font-bold ${trend.className}`}>{trend.icon} {trend.label}</p>
      {budget > 0 && (
        <div className="mt-5">
          <div className="h-3 overflow-hidden rounded-full bg-paisa-tag">
            <div className={`h-full rounded-full ${budgetColor(budgetPercent)}`} style={{ width: `${budgetPercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-paisa-muted">{formatRupee(total)} of {formatRupee(budget)} budget</p>
        </div>
      )}
      <Link to={`/pulse/transactions?category=${encodeURIComponent(card.query)}`} className="mt-5 inline-block text-sm font-bold text-paisa-accent hover:text-paisa-text">
        View transactions →
      </Link>
      {nudge && <p className="mt-4 border-t border-paisa-border pt-4 text-sm italic text-paisa-muted">{nudge}</p>}
    </section>
  );
}

function PulseEmptyDashboard() {
  return (
    <div className="grid min-h-[calc(100vh-8rem)] place-items-center">
      <section className="w-full max-w-4xl text-center">
        <h1 className="font-heading text-4xl font-extrabold sm:text-5xl">Your Pulse is waiting 💓</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-paisa-muted">
          Upload your first bank statement to see where your money goes.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["🍔", "Food Delivery"],
            ["🛒", "Quick Commerce"],
            ["📱", "Subscriptions"],
          ].map(([icon, label]) => (
            <div key={label} className="rounded-2xl border border-paisa-border bg-paisa-card p-5">
              <div className="text-4xl">{icon}</div>
              <p className="mt-3 font-heading text-lg font-bold">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/pulse/upload" className="btn-primary">
            Upload your first statement
          </Link>
          <Link to="/pulse/demo" className="btn-secondary">
            View sample dashboard
          </Link>
        </div>
        <p className="mt-4 text-center text-sm text-paisa-muted">No bank login. No SMS access. Just your CSV or PDF.</p>
        <div className="mt-8">
          <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Supported banks</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {["HDFC (PDF + CSV)", "Bank of Baroda (PDF + CSV)", "Any Bank (CSV)"].map((bank) => (
              <span key={bank} className="rounded-full border border-paisa-border px-3 py-1 text-xs text-paisa-muted">
                {bank}
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function waitForPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function WeeklyShareCard({ totals, currentMonth }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [insight, setInsight] = useState("");
  const shareId = "pulse-weekly-share-card";

  async function downloadCard() {
    setIsDownloading(true);
    let nextInsight = "";
    try {
      nextInsight = await generateCardInsight(
        totals.foodDelivery.current,
        totals.foodDelivery.previous,
        totals.quickCommerce.current,
        totals.quickCommerce.previous,
        totals.subscriptions.current,
        totals.subscriptions.previous,
      );
      setInsight(nextInsight);
      await waitForPaint();
    } catch {
      setInsight("");
      await waitForPaint();
    }

    try {
      const node = document.getElementById(shareId);
      if (!node) return;
      const backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim();
      const canvas = await html2canvas(node, {
        backgroundColor,
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `paisa-pulse-${currentMonth}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      if (!nextInsight) setInsight("");
      setIsDownloading(false);
    }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold">Weekly spending card</h2>
          <p className="mt-1 text-sm text-paisa-muted">Download a quick snapshot with an AI insight.</p>
        </div>
        <button type="button" onClick={downloadCard} disabled={isDownloading} className="btn-primary disabled:cursor-not-allowed disabled:opacity-70">
          {isDownloading ? "Generating insight..." : "Download PNG"}
        </button>
      </div>
      <div
        id={shareId}
        className="mt-5 max-w-xl rounded-2xl border border-paisa-border bg-paisa-bg p-5 text-paisa-text"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Paisa Pulse · {currentMonth}</p>
        <h3 className="mt-2 font-heading text-2xl font-extrabold">This month’s pulse 💓</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {CATEGORIES.map((card) => (
            <div key={card.key} className="rounded-xl border border-paisa-border bg-paisa-card p-3">
              <p className="text-2xl">{card.emoji}</p>
              <p className="mt-2 text-xs font-bold text-paisa-muted">{card.name}</p>
              <p className="font-heading text-xl font-extrabold">{formatRupee(totals[card.key].current)}</p>
            </div>
          ))}
        </div>
        {insight && <p className="mt-4 text-sm italic text-paisa-muted">✦ {insight}</p>}
      </div>
    </section>
  );
}

export default function PulseDashboard() {
  const { items: transactions } = usePulseTransactions("transactions");
  const cycle = usePulseSalaryCycleContext();
  const { profile } = usePulseAuth();
  const [nudges, setNudges] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey());
  const months = useMemo(() => (
    [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort().reverse()
  ), [transactions]);
  useEffect(() => {
    if (months.length && !months.includes(selectedMonth)) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);
  const currentMonth = months.includes(selectedMonth) ? selectedMonth : latestTransactionMonth(transactions);
  const previousMonth = lastMonthKey(currentMonth);
  const budgets = profile?.categoryBudgets || {};
  const isSurvival = cycle?.phase === "survival";

  const totals = useMemo(() => CATEGORIES.reduce((acc, card) => ({
    ...acc,
    [card.key]: {
      current: totalFor(transactions, card.categories, currentMonth),
      previous: totalFor(transactions, card.categories, previousMonth),
    },
  }), {}), [transactions, currentMonth, previousMonth]);

  useEffect(() => {
    if (!transactions.length) {
      setNudges(null);
      return undefined;
    }
    let alive = true;
    generatePulseNudges(
      totals.foodDelivery.current,
      totals.foodDelivery.previous,
      totals.quickCommerce.current,
      totals.quickCommerce.previous,
      totals.subscriptions.current,
      totals.subscriptions.previous,
    ).then((nextNudges) => {
      if (alive) setNudges(nextNudges);
    });
    return () => {
      alive = false;
    };
  }, [totals, transactions.length]);

  const visibleCards = isSurvival ? CATEGORIES.filter((card) => card.key === "subscriptions") : CATEGORIES;

  if (transactions.length === 0) {
    return <PulseEmptyDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Your Pulse 💓</h1>
          <p className="text-paisa-muted">{cycle?.label || "Current salary cycle"} · Showing {currentMonth}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {months.length > 0 && (
            <select className="input max-w-[180px]" value={currentMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              {months.map((month) => <option key={month} value={month}>{month}</option>)}
            </select>
          )}
          {!transactions.length && <Link to="/pulse/upload" className="text-sm font-bold text-paisa-accent hover:text-paisa-text">Upload statement</Link>}
        </div>
      </div>
      {isSurvival && (
        <p className="survival-card p-4 font-bold text-paisa-text">
          Survival mode — focus on cutting fixed subscriptions first.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        {visibleCards.map((card) => (
          <PulseCategoryCard
            key={card.key}
            card={card}
            total={totals[card.key].current}
            previous={totals[card.key].previous}
            budget={Number(budgets[card.key] || 0)}
            nudge={nudges?.[card.key]}
          />
        ))}
      </div>
      <WeeklyShareCard totals={totals} currentMonth={currentMonth} />
    </div>
  );
}
