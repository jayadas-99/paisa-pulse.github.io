import { useEffect, useState } from "react";
import { CATEGORIES, formatRupee } from "../../utils/categoryHelpers";
import { updateTransaction, saveCategoryRule, updateTransactions } from "../../services/transactionService";
import { merchantRuleKey } from "../../utils/merchantRules";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { categorizeTransactions } from "../../services/groqService";

export default function RecentTransactions({ transactions, pageSize = 12, collapsible = false, defaultExpanded = true }) {
  const { user } = useAuth();
  const { items: categoryRules } = useTransactions("categoryRules");
  const [saving, setSaving] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [page, setPage] = useState(0);
  const rows = [...transactions]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const pageCount = Math.max(Math.ceil(rows.length / pageSize), 1);
  const safePage = Math.min(page, pageCount - 1);
  const visibleRows = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  async function changeCategory(transaction, category) {
    setSaving(transaction.id);
    const key = merchantRuleKey(transaction);
    const merchant = transaction.merchant && transaction.merchant !== "Other"
      ? transaction.merchant
      : transaction.description;
    await updateTransaction(user.uid, transaction.id, {
      category,
      merchant,
      categorizationSource: "user",
      categoryConfidence: 1,
      categoryRuleKey: key,
    });
    await saveCategoryRule(user.uid, {
      key,
      merchant,
      category,
      sampleDescription: transaction.description,
      rawLine: transaction.rawLine || "",
    });
    setSaving("");
  }

  async function refreshBatch() {
    if (!visibleRows.length) return;
    setRefreshing(true);
    try {
      const refreshed = await categorizeTransactions(visibleRows, {
        force: true,
        preferAi: true,
        userRules: categoryRules,
      });
      await updateTransactions(user.uid, refreshed.map(({ _index, ...transaction }) => transaction));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Review transactions</h2>
          <p className="text-sm text-paisa-muted">Correcting one row teaches Paisa Coach that merchant for next time.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rows.length > pageSize && (
            <div className="flex items-center gap-2 text-sm text-paisa-muted">
              <button
                className="rounded-lg border border-paisa-border px-3 py-2 disabled:opacity-40"
                disabled={safePage === 0}
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
              >
                Prev
              </button>
              <span>Batch {safePage + 1}/{pageCount}</span>
              <button
                className="rounded-lg border border-paisa-border px-3 py-2 disabled:opacity-40"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((current) => Math.min(current + 1, pageCount - 1))}
              >
                Next
              </button>
            </div>
          )}
          <button
            onClick={refreshBatch}
            disabled={!visibleRows.length || refreshing || !expanded}
            className="rounded-lg border border-paisa-border px-3 py-2 text-sm font-bold hover:bg-paisa-hover disabled:opacity-40"
            title="Recategorize this visible batch"
          >
            {refreshing ? "Refreshing..." : "↻ Recategorize batch"}
          </button>
          {collapsible && (
            <button
              onClick={() => setExpanded((current) => !current)}
              className="rounded-lg border border-paisa-border px-3 py-2 text-sm font-bold hover:bg-paisa-hover"
            >
              {expanded ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>
      {expanded && rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-paisa-muted">
              <tr><th className="py-2">Date</th><th>Merchant / narration</th><th className="text-right">Amount</th><th>Category</th><th>Source</th></tr>
            </thead>
            <tbody>
              {visibleRows.map((tx) => (
                <tr key={tx.id} className="border-t border-paisa-border">
                  <td className="py-3">{tx.date}</td>
                  <td className="max-w-[320px] truncate">{tx.merchant && tx.merchant !== "Other" ? tx.merchant : tx.description}</td>
                  <td className="text-right">{formatRupee(tx.amount)}</td>
                  <td>
                    <select className="input max-w-[180px] py-2" value={tx.category || "Other"} onChange={(event) => changeCategory(tx, event.target.value)} disabled={saving === tx.id}>
                      {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </td>
                  <td className="text-xs text-paisa-muted">{saving === tx.id ? "saving..." : tx.categorizationSource || "unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : expanded ? <p className="text-paisa-muted">No transactions in this month yet.</p> : (
        <p className="text-sm text-paisa-muted">{rows.length} transactions hidden. Expand when you want to review or recategorize them.</p>
      )}
    </section>
  );
}
