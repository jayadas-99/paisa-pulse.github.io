import { useEffect, useState } from "react";
import { usePulseAuth } from "../../hooks/usePulseAuth";

const FIELDS = [
  ["foodDelivery", "🍔 Food Delivery budget (₹)"],
  ["quickCommerce", "🛒 Quick Commerce budget (₹)"],
  ["subscriptions", "📱 Subscriptions budget (₹)"],
];

export default function PulseSettings() {
  const { profile, updateUserProfile } = usePulseAuth();
  const [values, setValues] = useState({ foodDelivery: "", quickCommerce: "", subscriptions: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const budgets = profile?.categoryBudgets || {};
    setValues({
      foodDelivery: budgets.foodDelivery || "",
      quickCommerce: budgets.quickCommerce || "",
      subscriptions: budgets.subscriptions || "",
    });
  }, [profile]);

  async function saveBudgets(event) {
    event.preventDefault();
    await updateUserProfile({
      categoryBudgets: {
        foodDelivery: Number(values.foodDelivery || 0),
        quickCommerce: Number(values.quickCommerce || 0),
        subscriptions: Number(values.subscriptions || 0),
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-extrabold">Pulse Settings</h1>
        <p className="text-paisa-muted">Tune the three habits Paisa Pulse tracks.</p>
      </div>
      <form onSubmit={saveBudgets} className="card max-w-2xl space-y-5">
        <div>
          <h2 className="font-heading text-xl font-bold">Monthly Budgets</h2>
          <p className="text-sm text-paisa-muted">Set monthly limits for your Pulse categories.</p>
        </div>
        {FIELDS.map(([key, label]) => (
          <label key={key} className="block">
            <span className="mb-2 block text-sm font-bold text-paisa-muted">{label}</span>
            <input
              className="input"
              type="number"
              min="0"
              inputMode="numeric"
              value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn-primary">Save budgets</button>
          {saved && <span className="text-sm font-bold text-green-300">Saved ✓</span>}
        </div>
      </form>
    </div>
  );
}
