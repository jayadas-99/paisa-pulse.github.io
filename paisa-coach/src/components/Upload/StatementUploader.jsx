import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { detectSalaryCredit } from "../../parsers/hdfc.js";
import { parseUniversalStatement } from "../../parsers/universalParser.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function extractPdfText(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
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
  }

  return pageTexts.join("\n");
}

export default function StatementUploader({ onTransactionsParsed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingUniversalText, setPendingUniversalText] = useState("");

  async function handleFile(file) {
    setError("");
    setPendingUniversalText("");
    if (!file?.name?.toLowerCase().endsWith(".pdf")) {
      setError("We couldn't read this statement. Make sure it's a bank statement PDF.");
      return;
    }

    setLoading(true);
    try {
      const rawText = await extractPdfText(file);
      setPendingUniversalText(rawText);
    } catch {
      setError("We couldn't read this statement. Try another PDF or upload a CSV instead.");
    } finally {
      setLoading(false);
    }
  }

  async function analyseUniversalStatement() {
    setLoading(true);
    setError("");
    try {
      const transactions = await parseUniversalStatement(pendingUniversalText);
      const salary = detectSalaryCredit(transactions);
      onTransactionsParsed(transactions, salary, "AI Parsed");
      setPendingUniversalText("");
    } catch (err) {
      setError(typeof err?.message === "string" && err.message !== "[object Object]" ? err.message : "We couldn't read this statement. Try another PDF or upload a CSV instead.");
    } finally {
      setLoading(false);
    }
  }

  function cancelUniversalAnalysis() {
    setPendingUniversalText("");
    setError("");
    setLoading(false);
  }

  return (
    <section className="card space-y-4">
      <p className="text-sm text-paisa-muted">Your PDF is read locally on your device. We never see, store, or upload it.</p>
      <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-paisa-border bg-[#0f0f16] p-8 text-center hover:bg-paisa-hover">
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
