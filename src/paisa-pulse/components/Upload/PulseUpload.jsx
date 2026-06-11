import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { usePulseTransactions } from "../../hooks/usePulseTransactions";
import { parseBankCsv } from "../../utils/pulseCsvParser";
import { finalPulseCategory, formatRupee, monthKey } from "../../utils/pulseCategoryHelpers";
import { categorizePulseTransactions } from "../../services/pulseGroq";
import { savePulseTransactions } from "../../services/pulseDataService";
import PulseStatementUploader from "./PulseStatementUploader";
import { friendlyAuthError } from "../../utils/pulseAuthErrors";

const PDF_CATEGORY_TO_APP_CATEGORY = {
  "Food Delivery": "Food",
};

function toPdfDateString(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function ProgressBar({ value, label }) {
  const percent = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="mt-5 rounded-xl border border-paisa-border bg-paisa-tag p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-paisa-muted">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paisa-border">
        <div
          className="h-full rounded-full bg-paisa-accent transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function primaryStatementMonths(transactions = []) {
  const counts = transactions.reduce((acc, transaction) => {
    const key = monthKey(transaction.date);
    if (key) acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return [];

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const [primaryMonth, primaryCount] = entries[0];
  return primaryCount / total >= 0.7 ? [primaryMonth] : entries.map(([month]) => month);
}

function pulsePreviewSummary(transactions = []) {
  const summary = {
    Food: { label: "Food Delivery", total: 0, count: 0 },
    Groceries: { label: "Quick Commerce", total: 0, count: 0 },
    Subscriptions: { label: "Subscriptions", total: 0, count: 0 },
  };

  transactions.forEach((transaction) => {
    if (Number(transaction.amount) >= 0) return;
    const category = finalPulseCategory(transaction);
    if (!summary[category]) return;
    summary[category].total += Math.abs(Number(transaction.amount || 0));
    summary[category].count += 1;
  });

  return summary;
}

export default function PulseUpload() {
  const { user, updateUserProfile } = usePulseAuth();
  const { items: existing } = usePulseTransactions("transactions");
  const navigate = useNavigate();
  const [parsed, setParsed] = useState([]);
  const [source, setSource] = useState("");
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const replaceMonths = useMemo(() => primaryStatementMonths(parsed), [parsed]);
  const previewSummary = useMemo(() => pulsePreviewSummary(parsed), [parsed]);
  const duplicate = useMemo(() => {
    const incomingMonths = new Set(replaceMonths);
    return existing.some((tx) => incomingMonths.has(monthKey(tx.date)));
  }, [replaceMonths, existing]);

  async function handleFile(file) {
    setError("");
    setUploadProgress(null);
    if (!file?.name?.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    try {
      const result = await parseBankCsv(file);
      setParsed(result.transactions);
      setSource("CSV");
      setSalaryInfo(null);
    } catch (err) {
      setError(err.message || "Could not parse this CSV.");
    }
  }

  function handlePdfTransactions(transactions, salary, bankName = "Bank") {
    const mappedTransactions = transactions.map((transaction) => ({
      date: toPdfDateString(transaction.date),
      description: transaction.narration,
      merchantRaw: transaction.narration,
      amount: transaction.type === "debit" ? -transaction.amount : transaction.amount,
      category: transaction.isSalary ? "Salary" : PDF_CATEGORY_TO_APP_CATEGORY[transaction.category] || transaction.category,
      merchant: transaction.isSalary ? "Salary" : transaction.merchant,
      merchantToken: transaction.merchantToken,
      balance: transaction.balance,
      rawLine: transaction.rawLine,
      categorizationSource: transaction.isSalary ? "salary-detection" : transaction.categorizationSource,
      categoryConfidence: transaction.isSalary ? 1 : transaction.categoryConfidence,
      isSalary: Boolean(transaction.isSalary),
    }));
    setParsed(mappedTransactions);
    setSource(`${bankName} PDF`);
    setSalaryInfo(salary);
    setError("");
    setUploadProgress(null);
  }

  async function confirmUpload() {
    setBusy(true);
    setError("");
    setUploadProgress({ value: 10, label: "Preparing transactions" });
    try {
      setUploadProgress({ value: 35, label: "Categorising pulse categories" });
      const categorized = await categorizePulseTransactions(parsed);
      setUploadProgress({ value: 70, label: duplicate ? "Replacing old month and saving transactions" : "Saving transactions" });
      await savePulseTransactions(user.uid, categorized, { replaceMonths });
      if (salaryInfo?.salaryAmount > 0 && salaryInfo?.salaryDate) {
        setUploadProgress({ value: 88, label: "Updating salary cycle" });
        await updateUserProfile({
          salaryDate: salaryInfo.salaryDate,
          monthlyIncome: salaryInfo.salaryAmount,
        });
      }
      setUploadProgress({ value: 100, label: "Pulse updated" });
      navigate("/pulse", { state: { toast: "All done! Your Pulse is updated 💓" } });
    } catch (err) {
      setError(friendlyAuthError(err));
      setUploadProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">Upload Transactions</h1>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wide text-paisa-muted">Supported banks</span>
        {["HDFC Bank (PDF + CSV)", "Bank of Baroda (PDF + CSV)", "Any bank (CSV)"].map((bank) => (
          <span key={bank} className="rounded-full border border-paisa-border px-3 py-1 text-xs">
            {bank}
          </span>
        ))}
      </div>
      <PulseStatementUploader onTransactionsParsed={handlePdfTransactions} />
      <div className="flex items-center gap-3 text-sm text-paisa-muted">
        <span className="h-px flex-1 bg-paisa-border" />
        <span>or upload CSV</span>
        <span className="h-px flex-1 bg-paisa-border" />
      </div>
      <label
        className="block cursor-pointer rounded-2xl border-2 border-dashed border-paisa-border bg-paisa-card p-10 text-center hover:bg-paisa-hover"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <input type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
        <div className="text-4xl">📤</div>
        <p className="mt-3 font-heading text-xl font-bold">Drop your bank statement CSV</p>
        <p className="mt-2 text-sm text-paisa-muted">CSV only. No SMS, no bank login, no creepy access.</p>
      </label>
      {error && <p className="rounded-xl bg-red-400/10 p-4 text-red-200">{error}</p>}
      {duplicate && <p className="rounded-xl bg-yellow-400/10 p-4 text-yellow-100">Heads up: {replaceMonths.join(", ")} is already uploaded. Confirming will replace that month with this cleaned upload.</p>}
      {parsed.length > 0 && (
        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-xl font-bold">Preview</h2>
            <span className="text-sm text-paisa-muted">{parsed.length} rows detected{source ? ` from ${source}` : ""}</span>
          </div>
          {salaryInfo?.salaryAmount > 0 && (
            <p className="mb-4 rounded-xl bg-green-400/10 p-3 text-sm text-green-200">
              Salary detected: ₹{salaryInfo.salaryAmount.toLocaleString("en-IN")} on day {salaryInfo.salaryDate}
            </p>
          )}
          <div className="mb-4 grid gap-3 md:grid-cols-3">
            {Object.entries(previewSummary).map(([key, item]) => (
              <div key={key} className="rounded-xl border border-paisa-border bg-paisa-tag p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-paisa-muted">{item.label}</p>
                <p className="mt-1 font-heading text-xl font-extrabold">{formatRupee(item.total)}</p>
                <p className="mt-1 text-xs text-paisa-muted">{item.count} matching rows</p>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-paisa-muted"><tr><th className="py-2">Date</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{parsed.slice(0, 5).map((tx, index) => <tr key={`${tx.date}-${index}`} className="border-t border-paisa-border"><td className="py-3">{tx.date}</td><td>{tx.description}</td><td className="text-right">₹{tx.amount}</td></tr>)}</tbody>
            </table>
          </div>
          <button onClick={confirmUpload} disabled={busy} className="btn-primary mt-5">
            {busy ? "Paisa Pulse is reading your transactions... 👀" : "Confirm and update Pulse"}
          </button>
          {uploadProgress && <ProgressBar value={uploadProgress.value} label={uploadProgress.label} />}
        </section>
      )}
    </div>
  );
}
