import { useEffect, useMemo, useState } from "react";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { usePulseSalaryCycleContext } from "../Shared/PulseSalaryCycleContext";
import { formatRupee, monthKey, pulseCategoryMatches } from "../../utils/pulseCategoryHelpers";
import { getCurrentMonthKey } from "../../utils/pulseSalaryCycleUtils";

const CATEGORIES = [
  {
    key: "foodDelivery",
    emoji: "🍔",
    name: "Food Delivery",
    categories: ["Food", "Food Delivery"],
  },
  {
    key: "quickCommerce",
    emoji: "🛒",
    name: "Quick Commerce",
    categories: ["Groceries", "Quick Commerce"],
  },
  {
    key: "subscriptions",
    emoji: "📱",
    name: "Subscriptions",
    categories: ["Bills", "Subscriptions"],
  },
];

function latestTransactionMonth(transactions = []) {
  const months = [...new Set(transactions.map((tx) => monthKey(tx.date)).filter(Boolean))].sort();
  return months.at(-1) || getCurrentMonthKey();
}

function totalFor(transactions, categories, targetMonth) {
  return transactions
    .filter((tx) => Number(tx.amount) < 0 && pulseCategoryMatches(tx, categories) && monthKey(tx.date) === targetMonth)
    .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);
}

export default function PulseSimulator() {
  const { items: transactions } = usePulseTransactions("transactions");
  const cycle = usePulseSalaryCycleContext();
  const currentMonth = useMemo(() => latestTransactionMonth(transactions), [transactions]);
  const totals = useMemo(() => CATEGORIES.reduce((acc, category) => ({
    ...acc,
    [category.key]: totalFor(transactions, category.categories, currentMonth),
  }), {}), [transactions, currentMonth]);
  const [targets, setTargets] = useState(() => CATEGORIES.reduce((acc, category) => ({
    ...acc,
    [category.key]: totals[category.key] || 0,
  }), {}));

  useEffect(() => {
    setTargets(CATEGORIES.reduce((acc, category) => ({
      ...acc,
      [category.key]: totals[category.key] || 0,
    }), {}));
  }, [totals]);

  const annualSaving = CATEGORIES.reduce((sum, category) => (
    sum + Math.max((totals[category.key] || 0) - (targets[category.key] || 0), 0)
  ), 0) * 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">What if I cut this?</h1>
        <p className="mt-1 text-paisa-muted">{cycle?.label || "Current salary cycle"} · Showing {currentMonth}</p>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const currentTotal = totals[category.key] || 0;
          const target = Number(targets[category.key] || 0);
          const saving = Math.max(currentTotal - target, 0);
          const max = Math.ceil(currentTotal / 100) * 100;

          return (
            <section key={category.key} className="card space-y-4">
              <label htmlFor={`${category.key}-target`} className="block font-bold">
                {category.emoji} {category.name} — currently {formatRupee(currentTotal)} this month
              </label>
              <input
                id={`${category.key}-target`}
                type="range"
                min="0"
                max={max}
                step="100"
                value={target}
                onChange={(event) => setTargets((current) => ({
                  ...current,
                  [category.key]: Number(event.target.value),
                }))}
                className="w-full accent-paisa-accent"
              />
              <p className="text-sm text-paisa-muted">
                Reducing to {formatRupee(target)}/month saves {formatRupee(saving)}/month → {formatRupee(saving * 12)} per year
              </p>
            </section>
          );
        })}
      </div>

      <section className="card text-center">
        <h2 className="font-heading text-xl font-bold">Your potential annual savings</h2>
        <p className="mt-4 font-heading text-4xl font-extrabold text-paisa-accent">{formatRupee(annualSaving)}</p>
        <p className="mt-2 text-sm text-paisa-muted">if you hit these targets every month</p>
      </section>
    </div>
  );
}
