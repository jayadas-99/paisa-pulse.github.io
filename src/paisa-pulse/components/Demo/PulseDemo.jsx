import { Link } from "react-router-dom";
import { formatRupee } from "../../utils/pulseCategoryHelpers";

const DEMO_CARDS = [
  {
    emoji: "🍔",
    name: "Food Delivery",
    current: 6800,
    previous: 8200,
    budget: 9000,
    nudge: "Swiggy and Zomato are down this month. Nice breathing room.",
  },
  {
    emoji: "🛒",
    name: "Quick Commerce",
    current: 4300,
    previous: 3100,
    budget: 5000,
    nudge: "Blinkit rose this month. Pantry top-ups may be bunching together.",
  },
  {
    emoji: "📱",
    name: "Subscriptions",
    current: 2199,
    previous: 2199,
    budget: 2500,
    nudge: "Recurring spends are steady. Audit yearly plans before renewal.",
  },
];

const DEMO_TRANSACTIONS = [
  ["12 Jun", "SWIGGY INSTAMART", "Quick Commerce", 849],
  ["11 Jun", "ZOMATO LIMITED", "Food Delivery", 612],
  ["10 Jun", "NETFLIX INDIA", "Subscriptions", 649],
  ["09 Jun", "BLINKIT", "Quick Commerce", 1240],
  ["08 Jun", "SPOTIFY INDIA", "Subscriptions", 119],
];

function budgetWidth(current, budget) {
  return `${Math.min(Math.round((current / budget) * 100), 100)}%`;
}

export default function PulseDemo() {
  const annualSaving = 24000;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Demo data</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold">See Paysa Pulse with sample numbers</h1>
          <p className="mt-2 max-w-3xl text-paisa-muted">
            These are made-up transactions so you can preview the dashboard before uploading your own statement.
          </p>
        </div>
        <Link to="/pulse/upload" className="btn-primary">
          Upload your statement
        </Link>
      </div>

      <section className="survival-card p-4">
        <p className="font-bold text-paisa-text">Salary cycle preview: Careful Zone</p>
        <p className="mt-1 text-sm text-paisa-muted">
          Paysa Pulse changes its nudges based on where you are in your salary month.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        {DEMO_CARDS.map((card) => (
          <section key={card.name} className="card">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-xl font-bold">{card.emoji} {card.name}</h2>
              <span className="rounded-full border border-paisa-border px-3 py-1 text-xs font-bold text-paisa-muted">sample</span>
            </div>
            <p className="mt-5 text-sm text-paisa-muted">This month</p>
            <p className="font-heading text-3xl font-extrabold">{formatRupee(card.current)}</p>
            <p className="mt-2 text-sm font-bold text-paisa-accent">
              {card.current <= card.previous ? "↓" : "↑"} {formatRupee(Math.abs(card.current - card.previous))} vs last month
            </p>
            <div className="mt-5">
              <div className="h-3 overflow-hidden rounded-full bg-paisa-tag">
                <div className="h-full rounded-full bg-paisa-accent" style={{ width: budgetWidth(card.current, card.budget) }} />
              </div>
              <p className="mt-2 text-sm text-paisa-muted">{formatRupee(card.current)} of {formatRupee(card.budget)} budget</p>
            </div>
            <p className="mt-4 border-t border-paisa-border pt-4 text-sm italic text-paisa-muted">{card.nudge}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card overflow-x-auto">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-heading text-xl font-bold">Transaction preview</h2>
            <span className="text-xs font-bold uppercase tracking-wide text-paisa-muted">sample rows</span>
          </div>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-paisa-muted">
              <tr>
                <th className="py-2">Date</th>
                <th>Merchant</th>
                <th>Category</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_TRANSACTIONS.map(([date, merchant, category, amount]) => (
                <tr key={`${date}-${merchant}`} className="border-t border-paisa-border">
                  <td className="py-3">{date}</td>
                  <td>{merchant}</td>
                  <td>{category}</td>
                  <td className="text-right">{formatRupee(amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card">
          <h2 className="font-heading text-xl font-bold">What if simulator preview</h2>
          <p className="mt-2 text-sm text-paisa-muted">Try targets after upload to see what small cuts add up to.</p>
          <div className="mt-6 rounded-2xl border border-paisa-border bg-paisa-tag p-5 text-center">
            <p className="text-sm text-paisa-muted">Potential annual savings</p>
            <p className="mt-2 font-heading text-4xl font-extrabold text-paisa-accent">{formatRupee(annualSaving)}</p>
            <p className="mt-2 text-sm text-paisa-muted">if you trim food and quick commerce by sample targets</p>
          </div>
          <Link to="/pulse/simulator" className="mt-5 inline-block text-sm font-bold text-paisa-accent hover:text-paisa-text">
            Open simulator →
          </Link>
        </section>
      </div>
    </div>
  );
}
