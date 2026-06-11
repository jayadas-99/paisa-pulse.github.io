import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { detectSalaryCredit } from "../../parsers/pulseHdfc.js";
import { parseBankOfBarodaStatement } from "../../parsers/pulseBankOfBaroda.js";
import { parseUniversalStatement } from "../../parsers/pulseUniversalParser.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function ProgressBar({ value, label }) {
  const percent = Math.max(0, Math.min(100, Math.round(value || 0)));
  return (
    <div className="rounded-xl border border-paisa-border bg-paisa-tag p-3">
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

function hasStrongBankOfBarodaParse(transactions = []) {
  if (transactions.length < 20) return false;

  const withValidDates = transactions.filter((transaction) => (
    transaction.date instanceof Date && !Number.isNaN(transaction.date.getTime())
  ));
  const withBalances = transactions.filter((transaction) => Number.isFinite(Number(transaction.balance)));
  const withBankNarration = transactions.filter((transaction) => (
    /UPI\/|NEFT-|PRCR\/|ACH|ATM\/CASH|SMS Charges|SI:/.test(transaction.narration || "")
  ));

  return withValidDates.length >= transactions.length * 0.9
    && withBalances.length >= transactions.length * 0.75
    && withBankNarration.length >= transactions.length * 0.5;
}

function parseBankOfBarodaFirst(rawText = "") {
  const transactions = parseBankOfBarodaStatement(rawText);
  return hasStrongBankOfBarodaParse(transactions) ? transactions : [];
}

async function extractPdfText(file, onProgress) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({
      value: Math.round((pageNumber - 1) / pdf.numPages * 35),
      label: `Reading page ${pageNumber} of ${pdf.numPages}`,
    });
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = content.items.reduce((groups, item) => {
      const y = Math.round(item.transform?.[5] || 0);
      const current = groups.get(y) || [];
      current.push(item);
      groups.set(y, current);
      return groups;
    }, new Map());

    const text = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items
        .sort((a, b) => (a.transform?.[4] || 0) - (b.transform?.[4] || 0))
        .map((item) => item.str)
        .join(" "))
      .join("\n");

    pageTexts.push(text);
    onProgress?.({
      value: Math.round(pageNumber / pdf.numPages * 35),
      label: `Read page ${pageNumber} of ${pdf.numPages}`,
    });
  }

  return pageTexts.join("\n");
}

export default function StatementUploader({ onTransactionsParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingUniversalText, setPendingUniversalText] = useState("");
  const [progress, setProgress] = useState(null);

  async function handleFile(file) {
    setError("");
    setPendingUniversalText("");
    setProgress(null);
    if (!file?.name?.toLowerCase().endsWith(".pdf")) {
      setError("We couldn't read this statement. Make sure it's a bank statement PDF.");
      return;
    }

    setLoading(true);
    try {
      setProgress({ value: 2, label: "Opening PDF" });
      const rawText = await extractPdfText(file, setProgress);
      setProgress({ value: 70, label: "Checking local bank parsers" });
      const bankOfBarodaTransactions = parseBankOfBarodaFirst(rawText);
      if (bankOfBarodaTransactions.length) {
        const salary = detectSalaryCredit(bankOfBarodaTransactions);
        setProgress({ value: 100, label: `Found ${bankOfBarodaTransactions.length} Bank of Baroda transactions` });
        onTransactionsParsed(bankOfBarodaTransactions, salary, "Bank of Baroda");
        return;
      }
      setPendingUniversalText(rawText);
      setProgress({ value: 40, label: "Ready to analyse transactions" });
    } catch {
      setError("We couldn't read this statement. Try another PDF or upload a CSV instead.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  async function analyseUniversalStatement() {
    setLoading(true);
    setError("");
    setProgress({ value: 42, label: "Preparing transaction text" });
    try {
      setProgress({ value: 70, label: "Checking local bank parsers" });
      const bankOfBarodaTransactions = parseBankOfBarodaFirst(pendingUniversalText);
      if (bankOfBarodaTransactions.length) {
        const salary = detectSalaryCredit(bankOfBarodaTransactions);
        setProgress({ value: 100, label: `Found ${bankOfBarodaTransactions.length} Bank of Baroda transactions` });
        onTransactionsParsed(bankOfBarodaTransactions, salary, "Bank of Baroda");
        setPendingUniversalText("");
        return;
      }

      const transactions = await parseUniversalStatement(pendingUniversalText, {
        onProgress: ({ current = 0, total = 1, message }) => {
          const chunkPercent = total > 0 ? current / total : 0;
          setProgress({
            value: 42 + Math.round(chunkPercent * 53),
            label: message || "Analysing statement text",
          });
        },
      });
      const salary = detectSalaryCredit(transactions);
      setProgress({ value: 100, label: `Found ${transactions.length} transactions` });
      onTransactionsParsed(transactions, salary, "AI Parsed");
      setPendingUniversalText("");
    } catch (err) {
      setError(typeof err?.message === "string" && err.message !== "[object Object]" ? err.message : "We couldn't read this statement. Try another PDF or upload a CSV instead.");
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }

  function cancelUniversalAnalysis() {
    setPendingUniversalText("");
    setError("");
    setProgress(null);
    setLoading(false);
  }

  return (
    <section className="card space-y-4">
      <p className="text-sm text-paisa-muted">Your PDF is read locally on your device. We never see, store, or upload it.</p>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-paisa-border bg-paisa-tag p-8 text-center hover:bg-paisa-hover">
        <input
          type="file"
          accept=".pdf"
          className="hidden"
          disabled={loading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <div className="text-4xl">📄</div>
        <p className="mt-3 font-heading text-xl font-bold">Upload bank statement PDF</p>
        <p className="mt-2 text-sm text-paisa-muted">{loading ? "Reading your statement..." : "PDF only. Parsed locally in your browser."}</p>
      </label>
      {progress && <ProgressBar value={progress.value} label={progress.label} />}
      {pendingUniversalText && (
        <div className="rounded-2xl border border-blue-400/30 bg-blue-400/10 p-5">
          <h2 className="font-heading text-lg font-bold text-blue-200">🔒 Your file stays on your device</h2>
          <p className="mt-2 text-sm text-blue-100/90">We extract transaction text locally, then send only transaction rows to AI for categorisation. Your PDF never leaves your browser.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={analyseUniversalStatement} disabled={loading} className="btn-primary">
              {loading ? "Analysing..." : "Analyse Transactions"}
            </button>
            <button type="button" onClick={cancelUniversalAnalysis} disabled={loading} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}
      {error && <p className="rounded-xl bg-red-400/10 p-4 text-red-200">{error}</p>}
    </section>
  );
}
