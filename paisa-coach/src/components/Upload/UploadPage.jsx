import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { useSalaryCycleContext } from "../Shared/SalaryCycleContext";
import { parseBankCsv } from "../../utils/csvParser";
import { monthKey } from "../../utils/categoryHelpers";
import { categorizeTransactions, generateNudges } from "../../services/groqService";
import { saveNudges, saveTransactions } from "../../services/transactionService";
import StatementUploader from "./StatementUploader";
import { friendlyAuthError } from "../../utils/authErrors";

const PDF_CATEGORY_TO_APP_CATEGORY = {
  "Food Delivery": "Food",
};

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function UploadPage() {
  const { user, updateUserProfile } = useAuth();
  const { items: existing } = useTransactions("transactions");
  const { items: categoryRules } = useTransactions("categoryRules");
  const cycle = useSalaryCycleContext();
  const navigate = useNavigate();
  const [parsed, setParsed] = useState([]);
  const [source, setSource] = useState("");
  const [salaryInfo, setSalaryInfo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const duplicate = useMemo(() => {
    const incomingMonths = new Set(parsed.map((tx) => monthKey(tx.date)));
    return existing.some((tx) => incomingMonths.has(monthKey(tx.date)));
  }, [parsed, existing]);

  async function handleFile(file) {
    setError("");
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
      date: toLocalDateString(transaction.date),
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
  }

  async function confirmUpload() {
    setBusy(true);
    setError("");
    try {
      const categorized = await categorizeTransactions(parsed, { preferAi: true, userRules: categoryRules });
      await saveTransactions(user.uid, categorized);
      if (salaryInfo?.salaryAmount > 0 && salaryInfo?.salaryDate) {
        await updateUserProfile({
          salaryDate: salaryInfo.salaryDate,
          monthlyIncome: salaryInfo.salaryAmount,
        });
      }
      try {
        const nudges = await generateNudges(categorized, [], cycle);
        await saveNudges(user.uid, nudges, cycle.phase);
      } catch {
        // Transactions are the source of truth; coaching can be regenerated later.
      }
      navigate("/dashboard", { state: { toast: "All done! Your transactions are saved 💬" } });
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">Upload Transactions</h1>
      <StatementUploader onTransactionsParsed={handlePdfTransactions} />
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
      {duplicate && <p className="rounded-xl bg-yellow-400/10 p-4 text-yellow-100">Heads up: this looks like a month you've uploaded before. You can still continue.</p>}
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-paisa-muted"><tr><th className="py-2">Date</th><th>Description</th><th className="text-right">Amount</th></tr></thead>
              <tbody>{parsed.slice(0, 5).map((tx, index) => <tr key={`${tx.date}-${index}`} className="border-t border-paisa-border"><td className="py-3">{tx.date}</td><td>{tx.description}</td><td className="text-right">₹{tx.amount}</td></tr>)}</tbody>
            </table>
          </div>
          <button onClick={confirmUpload} disabled={busy} className="btn-primary mt-5">
            {busy ? "Paysa Coach is reading your transactions... 👀" : "Confirm and coach me"}
          </button>
        </section>
      )}
    </div>
  );
}
