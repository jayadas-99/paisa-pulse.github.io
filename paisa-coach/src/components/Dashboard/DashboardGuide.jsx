export default function DashboardGuide() {
  return (
    <section className="card">
      <h2 className="font-heading text-xl font-bold">How to use Paysa Coach</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <GuideItem title="1. Upload" text="Add last month's statement to build your money map." />
        <GuideItem title="2. Review" text="Fix wrong categories once. Paysa Coach remembers that merchant." />
        <GuideItem title="3. Ask" text="Use chat for questions like food spend, avoidable spend, or biggest leak." />
        <GuideItem title="4. Act" text="Use safe-to-spend and nudges to make this salary cycle calmer." />
      </div>
    </section>
  );
}

function GuideItem({ title, text }) {
  return (
    <div className="rounded-xl border border-paisa-border bg-paisa-hover p-4">
      <p className="font-heading text-sm font-bold">{title}</p>
      <p className="mt-2 text-sm text-paisa-muted">{text}</p>
    </div>
  );
}
