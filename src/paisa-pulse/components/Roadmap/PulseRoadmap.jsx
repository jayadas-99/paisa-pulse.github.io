const SECTIONS = [
  {
    title: "Now",
    marker: "✓",
    items: [
      "HDFC + Bank of Baroda PDF parsing (browser-local, no upload)",
      "AI categorisation via Groq with India-native merchant preclassification",
      "Salary-cycle-aware dashboard phases: Flush / Steady / Careful / Survival",
      "Shareable weekly spending card",
      "Subscription audit with recurring detection",
      "Goal tracking with salary-cycle-sensitive behaviour",
      "Budget simulator: \"what if I cut Swiggy by ₹500/month?\"",
    ],
  },
  {
    title: "Next",
    marker: "→",
    items: [
      "Axis Bank and SBI PDF parser",
      "Budget alerts — email or in-app push when a category hits 80% of budget",
      "Merchant-level drill-down: see every individual Swiggy/Zomato order in one tap",
    ],
  },
  {
    title: "Later",
    marker: "○",
    items: [
      "Multi-month trend chart: rolling 6-month view per category",
      "Anonymous peer benchmarking: \"people in your salary range spend X on food delivery\"",
      "Export to Google Sheets",
      "WhatsApp nudge integration (no SMS access — uses WhatsApp Business API)",
    ],
  },
];

export default function PulseRoadmap() {
  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">What's coming to Paysa Pulse 🗺️</h1>

      <div className="grid gap-5 lg:grid-cols-3">
        {SECTIONS.map((section) => (
          <section key={section.title} className="card">
            <h2 className="font-heading text-xl font-bold">{section.title}</h2>
            <ul className="mt-4 space-y-3">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-6 text-paisa-muted">
                  <span className="mt-0.5 shrink-0 font-bold text-paisa-accent">{section.marker}</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="text-sm text-paisa-muted">
        Built by Jaya Das. Last updated June 2026. Have a feature request? reach out on{" "}
        <a href="https://www.linkedin.com/in/jayadas9" target="_blank" rel="noreferrer" className="font-bold text-paisa-accent hover:text-paisa-text">
          LinkedIn
        </a>.
      </p>
    </div>
  );
}
