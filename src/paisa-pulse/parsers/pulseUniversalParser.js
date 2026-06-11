import { detectMerchant } from "./pulseHdfc.js";

const SYSTEM_PROMPT = "You are a bank statement parser. Extract transactions from Indian bank statement text. Return ONLY a valid minified JSON object shaped exactly as {\"transactions\":[{\"date\":\"YYYY-MM-DD\",\"description\":\"string\",\"amount\":number,\"balance\":number|null}]}. Amount must be negative for debits and positive for credits. Escape quotes inside strings. No markdown, no explanation.";
const DATE_TOKEN = /\b(?:\d{1,2}[/-]\d{1,2}[/-](?:\d{2}|\d{4})|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})\b/;
const MONEY_TOKEN = /(?:Rs\.?|INR|₹)?\s*(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?\s*(?:CR|DR)?/i;
const TRANSACTION_KEYWORD = /\b(?:UPI|NEFT|IMPS|RTGS|ACH|NACH|ATM|POS|ECOM|MBK|CMS|CHQ|CASH|TRANSFER|DEBIT|CREDIT|BY|TO|FROM)\b/i;
const MAX_CHUNK_LINES = 14;
const RATE_LIMIT_BUFFER_MS = 750;
const MAX_GROQ_ATTEMPTS = 7;

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

function transactionsFromParsed(parsed) {
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.transactions)) return parsed.transactions;
  return null;
}

function parseTransactionPayload(text = "") {
  const cleanText = String(text).replace(/```(?:json)?|```/gi, "").trim();
  try {
    const parsed = JSON.parse(cleanText);
    return transactionsFromParsed(parsed);
  } catch {
    try {
      const match = cleanText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      return transactionsFromParsed(parsed);
    } catch {
      return null;
    }
  }
}

function parseDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const maxYear = new Date().getFullYear() + 1;
  if (year < 2000 || year > maxYear || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
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
  const match = String(message).match(/try again in\s+([\d.]+)\s*(ms|s)/i);
  if (!match) return 0;

  const value = Number(match[1]);
  if (!Number.isFinite(value)) return 0;

  return Math.ceil(match[2].toLowerCase() === "ms" ? value : value * 1000) + RATE_LIMIT_BUFFER_MS;
}

function fallbackRetryDelayMs(attempt = 1) {
  return Math.min(12000, 1500 * attempt);
}

async function requestGroq(messages, { onRetry } = {}, attempt = 1) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        ...messages,
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
      max_tokens: 1800,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = groqErrorMessage(data, response.status);
    const delay = response.status === 429 ? retryDelayMs(message) || fallbackRetryDelayMs(attempt) : 0;
    if (delay && attempt < MAX_GROQ_ATTEMPTS) {
      onRetry?.({ attempt, delay });
      await sleep(delay);
      return requestGroq(messages, { onRetry }, attempt + 1);
    }
    throw new Error(response.status === 429
      ? "Groq is rate-limiting the analysis right now. Please wait a few seconds and click Analyse Transactions again."
      : message);
  }

  return data.choices?.[0]?.message?.content || "";
}

async function repairTransactionJson(content = "", options = {}) {
  const repaired = await requestGroq([
    {
      role: "system",
      content: "Repair this malformed transaction JSON. Return ONLY a valid minified JSON object shaped exactly as {\"transactions\":[{\"date\":\"YYYY-MM-DD\",\"description\":\"string\",\"amount\":number,\"balance\":number|null}]}. Preserve all valid rows. No markdown.",
    },
    { role: "user", content: String(content).slice(0, 6000) },
  ], options);
  return parseTransactionPayload(repaired);
}

async function parseStatementChunk(text = "", options = {}) {
  const content = await requestGroq([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Parse this sanitized extracted bank statement text. Ignore headers, summaries, page footers, customer details, and non-transaction lines.\n\n${text}` },
  ], options);
  const parsed = parseTransactionPayload(content);
  if (parsed) return parsed;
  const repaired = await repairTransactionJson(content, options);
  if (repaired) return repaired;
  throw new Error("AI returned invalid transaction JSON. Please click Analyse Transactions again.");
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

export async function parseUniversalStatement(rawText = "", { onProgress } = {}) {
  const chunks = chunkText(extractTransactionRows(rawText));
  const parsedItems = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    onProgress?.({
      phase: "analysing",
      current: index,
      total: chunks.length,
      message: `Analysing statement text ${index + 1} of ${chunks.length}`,
    });
    parsedItems.push(...await parseStatementChunk(chunk, {
      onRetry: ({ delay }) => onProgress?.({
        phase: "waiting",
        current: index,
        total: chunks.length,
        message: `Groq is busy. Retrying in ${Math.ceil(delay / 1000)}s`,
      }),
    }));
    onProgress?.({
      phase: "analysing",
      current: index + 1,
      total: chunks.length,
      message: `Analysed statement text ${index + 1} of ${chunks.length}`,
    });
    if (index < chunks.length - 1) await sleep(1000);
  }

  const transactions = dedupeTransactions(normalizeTransactions(parsedItems));

  if (!transactions.length) throw new Error("AI could not find transaction rows in the extracted PDF text.");
  onProgress?.({
    phase: "done",
    current: chunks.length,
    total: chunks.length,
    message: `Found ${transactions.length} transactions`,
  });
  return transactions;
}
