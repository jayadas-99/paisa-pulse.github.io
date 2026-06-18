import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";

export default function SalaryCycleBar() {
  const cycle = useSalaryCycleContext();
  const percent = Math.min(Math.max(cycle?.cyclePercent || 0, 0), 100);
  const survival = cycle?.phase === "survival";

  return (
    <section className={`card mb-6 ${survival ? "border-red-400/40" : ""}`} style={survival ? { animation: "pulse-red 2.2s ease-in-out infinite" } : undefined}>
      {survival && (
        <div className="mb-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-200">
          Survival Mode 🔴 Keep it essential-only till salary day.
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-paisa-muted">Salary cycle</p>
          <h2 className="font-heading text-xl font-bold">{cycle?.label || "Fresh Start 🟢"}</h2>
        </div>
        <div className="text-right text-sm text-paisa-muted">
          <p>Next Salary in <span className="font-bold text-paisa-text">{cycle?.daysUntilNext || 0} days</span></p>
          <p>You've spent <span className="font-bold text-paisa-text">{cycle?.burnRate || 0}%</span> of this month's income</p>
        </div>
      </div>
      <div className="mb-2 flex justify-between text-xs font-bold text-paisa-muted">
        <span>Salary Day</span>
        <span>Next Salary in {cycle?.daysUntilNext || 0} days</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#20202c]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percent}%`, backgroundColor: cycle?.color || "#4ade80" }} />
      </div>
    </section>
  );
}
