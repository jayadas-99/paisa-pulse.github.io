import { formatRupee } from "../../utils/categoryHelpers";

function extractTransferRecipient(transaction) {
  const namedMerchant = transaction.merchant && !["Other", "UPI Transfer"].includes(transaction.merchant)
    ? transaction.merchant
    : "";
  if (namedMerchant) return namedMerchant;

  const raw = [
    transaction.merchantRaw,
    transaction.rawLine,
    transaction.description,
  ].filter(Boolean).join(" ");

  if (/ATM\/CASH|CASH WITHDRAWAL|CASH\/|ATM/i.test(raw)) return "Cash withdrawal";
  const upiMatch = raw.match(/\/UPI\/([^/\s]+(?:\s+[^\s/@]+@[a-z0-9]+)?)/i);
  if (upiMatch?.[1]) return upiMatch[1].replace(/\s+/g, "").slice(0, 42);
  const handleMatch = raw.match(/([a-z0-9._-]+@[a-z0-9]+)/i);
  if (handleMatch?.[1]) return handleMatch[1].slice(0, 42);
  const accountMatch = raw.match(/\b\d{8,}\b/);
  if (accountMatch?.[0]) return `Account ${accountMatch[0].slice(-4)}`;
  return "Unclear transfer";
}

export default function TransferBreakdown({ transactions = [] }) {
  const transferRows = transactions
    .filter((transaction) => transaction.category === "Transfers" && Number(transaction.amount) < 0)
    .map((transaction) => ({
      ...transaction,
      recipient: extractTransferRecipient(transaction),
      absoluteAmount: Math.abs(Number(transaction.amount || 0)),
    }));
  const total = transferRows.reduce((sum, transaction) => sum + transaction.absoluteAmount, 0);
  const grouped = Object.values(transferRows.reduce((acc, transaction) => {
    const key = transaction.recipient;
    const current = acc[key] || { recipient: key, amount: 0, count: 0, largest: 0, latestDate: "" };
    current.amount += transaction.absoluteAmount;
    current.count += 1;
    current.largest = Math.max(current.largest, transaction.absoluteAmount);
    current.latestDate = String(transaction.date) > String(current.latestDate) ? transaction.date : current.latestDate;
    acc[key] = current;
    return acc;
  }, {})).sort((a, b) => b.amount - a.amount);
  const largestRows = [...transferRows].sort((a, b) => b.absoluteAmount - a.absoluteAmount).slice(0, 6);

  if (!transferRows.length) {
    return (
      <section className="card">
        <h2 className="font-heading text-xl font-bold">Transfer breakdown</h2>
        <p className="mt-2 text-sm text-paisa-muted">No outgoing transfers in this month.</p>
      </section>
    );
  }

  return (
    <section className="card space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Transfer breakdown</h2>
          <p className="text-sm text-paisa-muted">Outgoing transfers grouped by recipient or UPI handle.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-paisa-muted">Total transfers</p>
          <p className="font-heading text-2xl font-extrabold">{formatRupee(total)}</p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {grouped.slice(0, 6).map((item) => (
          <div key={item.recipient} className="rounded-xl border border-paisa-border bg-paisa-hover p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-bold">{item.recipient}</p>
                <p className="text-xs text-paisa-muted">{item.count} transfers • largest {formatRupee(item.largest)}</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-bold">{formatRupee(item.amount)}</p>
                <p className="text-xs text-paisa-muted">{Math.round((item.amount / total) * 100)}%</p>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paisa-border">
              <div className="h-full rounded-full bg-paisa-accent" style={{ width: `${Math.max((item.amount / total) * 100, 4)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-paisa-muted">
            <tr><th className="py-2">Date</th><th>Recipient / handle</th><th>Narration</th><th className="text-right">Amount</th></tr>
          </thead>
          <tbody>
            {largestRows.map((transaction) => (
              <tr key={transaction.id} className="border-t border-paisa-border">
                <td className="py-3">{transaction.date}</td>
                <td className="max-w-[220px] truncate font-bold">{transaction.recipient}</td>
                <td className="max-w-[280px] truncate text-paisa-muted">{transaction.description}</td>
                <td className="text-right">{formatRupee(transaction.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
