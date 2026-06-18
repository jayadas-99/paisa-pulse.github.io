import Papa from "papaparse";

const DATE_KEYS = ["date", "transaction date", "txn date", "value date"];
const DESC_KEYS = ["description", "narration", "particulars", "details", "transaction details", "remarks"];
const AMOUNT_KEYS = ["amount", "transaction amount"];
const DEBIT_KEYS = ["debit", "withdrawal", "withdrawals", "dr", "debit amount"];
const CREDIT_KEYS = ["credit", "deposit", "deposits", "cr", "credit amount"];

function normalizeKey(key) {
  return String(key || "").trim().toLowerCase();
}

function findColumn(headers, candidates) {
  return headers.find((header) => candidates.includes(normalizeKey(header))) || null;
}

function parseAmount(raw) {
  if (raw === null || raw === undefined || raw === "") return 0;
  const text = String(raw).trim();
  const negativeByParens = /^\(.*\)$/.test(text);
  const cleaned = text.replace(/[₹,\s()]/g, "");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value)) return 0;
  return negativeByParens ? -Math.abs(value) : value;
}

function normalizeDate(raw) {
  const value = String(raw || "").trim();
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return value;
  const [, dd, mm, yyyy] = match;
  const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;
  return `${year}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export function parseBankCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta, errors }) => {
        if (errors.length) reject(errors[0]);
        const headers = meta.fields || [];
        const dateCol = findColumn(headers, DATE_KEYS);
        const descCol = findColumn(headers, DESC_KEYS);
        const amountCol = findColumn(headers, AMOUNT_KEYS);
        const debitCol = findColumn(headers, DEBIT_KEYS);
        const creditCol = findColumn(headers, CREDIT_KEYS);

        if (!dateCol || !descCol || (!amountCol && !debitCol && !creditCol)) {
          reject(new Error("Could not detect date, description and amount columns."));
          return;
        }

        const transactions = data
          .map((row) => {
            const credit = parseAmount(row[creditCol]);
            const debit = parseAmount(row[debitCol]);
            const amount = amountCol ? parseAmount(row[amountCol]) : credit > 0 ? credit : -Math.abs(debit);
            return {
              date: normalizeDate(row[dateCol]),
              description: String(row[descCol] || "").trim(),
              amount,
            };
          })
          .filter((tx) => tx.date && tx.description && Number.isFinite(tx.amount) && tx.amount !== 0);

        resolve({ transactions, columns: { dateCol, descCol, amountCol, debitCol, creditCol } });
      },
      error: reject,
    });
  });
}
