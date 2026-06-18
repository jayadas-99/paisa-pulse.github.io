import { detectMerchant } from "./hdfc.js";

const SYSTEM_PROMPT = "You are a bank statement parser. Extract transactions from Indian bank statement text. Return ONLY a valid minified JSON array with fields: date (YYYY-MM-DD), description (string), amount (number, negative for debits), balance (number or null). Escape quotes inside strings. No markdown, no explanation.";
const DATE_TOKEN = /\b(?:\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4})|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b/;
const MONEY_TOKEN = /(?:Rs\.?|INR|₹)?\s*(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?\s*(?:CR|DR)?/i;
const TRANSACTION_KEYWORD = /\b(?:UPI|NEFT|IMPS|RTGS|ACH|NACH|ATM|POS|ECOM|MBK|CMS|CHQ|CASH|TRANSFER|DEBIT|CREDIT|BY|TO|FROM)\b/i;
const MAX_CHUNK_LINES = 24;
const RATE_LIMIT_BUFFER_MS = 750;

function stripSensitiveText(rawText = "") {
  return String(rawText)
    .replace(/\b[A-Z]{4}0[A-Z0-9]{6}\b/gi, "[IFSC]")
    .replace(/\b[6-9]\d{9}\b/g, "[PHONE]")
    .replace(/\b\d{10,18}\b/g, "[ACCOUNT]");
}

function extractTransactionRows(rawText = "") {
  const lines = stripSensitiveText(rawText)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const rows = lines.filter((line, index) => {
    const looksTransactional = DATE_TOKEN.test(line) || MONEY_TOKEN.test(line) || TRANSACTION_KEYWORD.test(line);
    const nearTransactionLine = DATE_TOKEN.test(lines[index - 1] || "") || MONEY_TOKEN.test(lines[index - 1] || "")
      || DATE_TOKEN.test(lines[index + 1] || "") || MONEY_TOKEN.test(lines[index + 1] || "");
    return looksTransactional || nearTransactionLine;
  });

  return rows.length >= 3 ? rows.join("\n") : lines.join("\n");
}

function chunkText(text = "") {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const chunks = [];
  for (let index = 0; index < lines.length; index += MAX_CHUNK_LINES) {
    chunks.push(lines.slice(index, index + MAX_CHUNK_LINES).join("\n"));
  }
  return chunks.length ? chunks : [text];
}

function parseJsonArray(text = "") {
  const cleanText = String(text).replace(/```(?:json)?|```/gi, "").trim();
  try {
    const parsed = JSON.parse(cleanText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    try {
      const match = cleanText.match(/\[[\s\S]*\]/);
      if (!match) return [];
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      throw new Error("AI returned invalid transaction JSON. Please click Analyse Transactions again.");
    }
  }
}

function parseDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function parseBalance(value) {
  if (value === null || value === undefined) return null;
  const balance = Number(value);
  return Number.isFinite(balance) ? balance : null;
}

function groqErrorMessage(data, status) {
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.message === "string") return data.message;
  return `Groq request failed: ${status}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(message = "") {
  const match = String(message).match(/try again in ([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) + RATE_LIMIT_BUFFER_MS : 0;
}

async function parseStatementChunk(text = "", attempt = 1) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Parse this sanitized extracted bank statement text. Ignore headers, summaries, page footers, customer details, and non-transaction lines.\n\n${text}` },
      ],
      temperature: 0.1,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = groqErrorMessage(data, response.status);
    const delay = response.status === 429 ? retryDelayMs(message) : 0;
    if (delay && attempt <= 4) {
      await sleep(delay);
      return parseStatementChunk(text, attempt + 1);
    }
    throw new Error(message);
  }

  const content = data.choices?.[0]?.message?.content || "";
  return parseJsonArray(content);
}

function normalizeTransactions(items = []) {
  return items.map((item) => {
    const date = parseDate(item.date);
    const amount = parseAmount(item.amount);
    if (!date || amount === null || !item.description) return null;

    const narration = String(item.description).trim();
    const type = amount < 0 ? "debit" : "credit";
    return {
      date,
      narration,
      amount: Math.abs(amount),
      type,
      balance: parseBalance(item.balance),
      rawLine: narration,
      ...detectMerchant(narration),
    };
  }).filter(Boolean);
}

function dedupeTransactions(transactions = []) {
  const seen = new Set();
  return transactions.filter((transaction) => {
    const key = [
      transaction.date.toISOString().slice(0, 10),
      transaction.narration,
      transaction.amount,
      transaction.type,
      transaction.balance ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function parseUniversalStatement(rawText = "") {
  const chunks = chunkText(extractTransactionRows(rawText));
  const parsedItems = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    parsedItems.push(...await parseStatementChunk(chunk));
    if (index < chunks.length - 1) await sleep(1000);
  }

  const transactions = dedupeTransactions(normalizeTransactions(parsedItems));

  if (!transactions.length) throw new Error("AI could not find transaction rows in the extracted PDF text.");
  return transactions;
}
