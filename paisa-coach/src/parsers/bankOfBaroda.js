import { detectMerchant, detectSalaryCredit } from "./hdfc.js";
import { classifyUpiMerchant } from "../utils/upiMerchant.js";

const LINE_START_DATE = /^\d{2}[/-]\d{2}[/-](?:\d{4}|\d{2})/;
const DATE_TOKEN = /\b\d{2}[/-]\d{2}[/-](?:\d{4}|\d{2})\b/;
const DATE_TOKEN_GLOBAL = /\b\d{2}[/-]\d{2}[/-](?:\d{4}|\d{2})\b/g;
const MONEY_TOKEN = /(?:\d{1,3}(?:,\d{2,3})+|\d+)\.\d{2}\s*(?:CR|DR|Cr|Dr)?/g;

function parseMoney(value) {
  return Number.parseFloat(String(value || "").replace(/,/g, "").replace(/[^\d.-]/g, ""));
}

function parseDateToken(value) {
  const [day, month, yearToken] = value.replaceAll("-", "/").split("/").map(Number);
  const year = yearToken < 100 ? 2000 + yearToken : yearToken;
  return new Date(year, month - 1, day);
}

function isValidDateToken(value = "") {
  const [day, month, yearToken] = value.replaceAll("-", "/").split("/").map(Number);
  return Number.isInteger(day)
    && Number.isInteger(month)
    && Number.isInteger(yearToken)
    && day >= 1
    && day <= 31
    && month >= 1
    && month <= 12;
}

function isZeroAmount(value) {
  return Math.abs(parseMoney(value)) === 0;
}

function isSkippableLine(line) {
  const upper = line.toUpperCase();
  return !line.trim()
    || upper.includes("BANK OF BARODA")
    || upper.includes("OPENING BALANCE")
    || upper.includes("CLOSING BALANCE")
    || upper.includes("STATEMENT SUMMARY")
    || upper.includes("STATEMENT OF TRANSACTIONS")
    || upper.includes("ABBREVIATIONS")
    || upper.includes("TRANSACTION DATE")
    || upper.includes("PARTICULARS")
    || upper.includes("NARRATION")
    || upper.includes("WITHDRAWAL")
    || upper.includes("DEPOSIT")
    || upper.includes("BALANCE")
    || upper.includes("TOTAL")
    || upper.includes("ACCOUNT NO")
    || upper.includes("SAVINGS ACCOUNT")
    || upper.includes("TERM DEPOSIT")
    || upper.includes("TENURE")
    || upper.includes("MATURITY")
    || upper.includes("SR.NO")
    || upper.includes("CUMULATIVE")
    || upper.includes("INR FOR THE PERIOD")
    || upper.includes("CUSTOMER ID")
    || upper.includes("CUSTOMER CARE")
    || upper.includes("CYBER CRIME")
    || upper.includes("HTTPS://")
    || upper.includes("PAGE ");
}

function inferTypeFromNarration(narration, balanceToken = "") {
  const upper = `${narration} ${balanceToken}`.toUpperCase();
  if (upper.includes("SALARY")
    || upper.includes("NEFT CR")
    || upper.includes("IMPS CR")
    || upper.includes("UPI CR")
    || upper.includes("BY TRANSFER")
    || upper.includes("CREDIT")
    || upper.includes("REFUND")
    || upper.includes("INTEREST")) {
    return "credit";
  }
  return "debit";
}

function compactStatementLine(line = "") {
  return line
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getMoneyMatches(line = "") {
  return [...line.matchAll(MONEY_TOKEN)];
}

function getDateMatches(line = "") {
  return [...line.matchAll(DATE_TOKEN_GLOBAL)].filter((match) => isValidDateToken(match[0]));
}

function hasValidDate(line = "") {
  return getDateMatches(line).length > 0;
}

function hasDateAndAmount(line = "") {
  return hasValidDate(line) && getMoneyMatches(line).length >= 2;
}

function isLikelyNarrationContinuation(line = "") {
  const compactLine = compactStatementLine(line);
  if (!compactLine || isSkippableLine(compactLine) || hasValidDate(compactLine) || getMoneyMatches(compactLine).length) {
    return false;
  }

  if (/^(UPI|NEFT|IMPS|RTGS|MBK|ACH|ATM|POS|ECOM|NACH|CMS|CHQ|BY |TO |FROM )/i.test(compactLine)) {
    return false;
  }

  return compactLine.length <= 42 && (/[.@/]/.test(compactLine) || /^[a-z0-9-]+$/i.test(compactLine));
}

function isLikelyTransactionNarration(line = "") {
  return /^(UPI|NEFT|IMPS|RTGS|MBK|ACH|ATM|POS|ECOM|NACH|CMS|CHQ|CASH|BY |TO |FROM )/i.test(line)
    || /\/UPI\//i.test(line)
    || /Int\.?Pd/i.test(line);
}

function mergeNarrationFragment(base = "", fragment = "") {
  const cleanBase = base.trim();
  const cleanFragment = fragment.trim();
  if (!cleanBase) return cleanFragment;
  if (!cleanFragment) return cleanBase;

  if (/[@./_-]$/.test(cleanBase) || /^[@./_-]/.test(cleanFragment) || /^[a-z0-9-]+$/i.test(cleanFragment)) {
    return `${cleanBase}${cleanFragment}`;
  }

  return `${cleanBase} ${cleanFragment}`;
}

function withMerchantDetails(transaction) {
  const upper = transaction.narration.toUpperCase();

  if (/^SI:/.test(upper) || /FIXED DEPOSIT|FOR FD|TERM DEPOSIT/.test(upper)) {
    return {
      ...transaction,
      merchantRaw: transaction.narration,
      merchant: "Savings Transfer",
      category: "Savings",
      categorizationSource: "bank-rule",
      categoryConfidence: 0.9,
    };
  }

  if (/ATM\/CASH|CASH WITHDRAWAL|CASH\/|ATM/.test(upper)) {
    return {
      ...transaction,
      merchantRaw: transaction.narration,
      merchant: "Cash Withdrawal",
      category: "Transfers",
      categorizationSource: "bank-rule",
      categoryConfidence: 0.84,
    };
  }

  if (/SMS CHARGES|STATEMENT CHARGE|STATEMENT$/.test(upper)) {
    return {
      ...transaction,
      merchantRaw: transaction.narration,
      merchant: "Bank Charges",
      category: "Bills",
      categorizationSource: "bank-rule",
      categoryConfidence: 0.8,
    };
  }

  if ((transaction.type === "credit" || /INT\.?PD|INTEREST|CLAIM|SALARY/.test(upper)) && !/\/UPI\//.test(upper)) {
    const isSalaryNarration = /SALARY/.test(upper);
    return {
      ...transaction,
      merchantRaw: transaction.narration,
      merchant: isSalaryNarration ? "Salary" : "Income",
      category: isSalaryNarration ? "Salary" : "Income",
      categorizationSource: "bank-rule",
      categoryConfidence: isSalaryNarration ? 0.95 : 0.78,
    };
  }

  const upiMerchant = classifyUpiMerchant(transaction.narration);
  const merchantDetails = upiMerchant || detectMerchant(transaction.narration);
  const isUnknownUpi = !upiMerchant && /UPI/i.test(transaction.narration) && merchantDetails.category === "Other";

  if (isUnknownUpi) {
    return {
      ...transaction,
      merchantRaw: transaction.narration,
      merchant: "UPI Transfer",
      category: "Transfers",
      categorizationSource: "upi-transfer-fallback",
      categoryConfidence: 0.68,
    };
  }

  return {
    ...transaction,
    rawLine: transaction.rawLine,
    merchantRaw: upiMerchant?.merchantRaw || transaction.narration,
    ...merchantDetails,
  };
}

function appendContinuation(transaction, fragment) {
  const narration = mergeNarrationFragment(transaction.narration, fragment);
  return withMerchantDetails({
    ...transaction,
    narration,
    rawLine: `${transaction.rawLine}\n${fragment}`,
  });
}

function parseTransactionLine(rawLine) {
  const line = rawLine.trim();
  const compactLine = compactStatementLine(line);
  if (!hasValidDate(compactLine) || isSkippableLine(compactLine)) return null;

  const amountMatches = getMoneyMatches(compactLine);
  const firstAmountIndex = amountMatches[0]?.index ?? compactLine.length;
  const dateMatches = getDateMatches(compactLine)
    .filter((match) => match.index < firstAmountIndex);
  const dateToken = dateMatches[dateMatches.length - 1]?.[0];
  if (!dateToken || amountMatches.length < 2) return null;

  const trailingTokens = amountMatches.slice(-3).map((match) => match[0].trim());
  const balanceToken = trailingTokens[trailingTokens.length - 1];
  const balance = parseMoney(balanceToken);
  if (!Number.isFinite(balance)) return null;

  let amountToken;
  let type;

  if (trailingTokens.length >= 3) {
    const debitToken = trailingTokens[trailingTokens.length - 3];
    const creditToken = trailingTokens[trailingTokens.length - 2];
    if (!isZeroAmount(debitToken) && isZeroAmount(creditToken)) {
      amountToken = debitToken;
      type = "debit";
    } else if (!isZeroAmount(creditToken)) {
      amountToken = creditToken;
      type = "credit";
    }
  }

  if (!amountToken) {
    amountToken = trailingTokens[trailingTokens.length - 2];
  }

  const amount = parseMoney(amountToken);
  if (!Number.isFinite(amount) || amount === 0) return null;

  const firstTrailingAmountIndex = amountMatches[Math.max(0, amountMatches.length - trailingTokens.length)].index;
  const body = compactLine
    .slice(0, firstTrailingAmountIndex)
    .replace(/\b\d{2}[/-]\d{2}[/-](?:\d{4}|\d{2})\b/g, " ")
    .replace(/\s+\d{6,}\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const narration = body || "Bank of Baroda transaction";
  const resolvedType = type || inferTypeFromNarration(narration, balanceToken);

  return withMerchantDetails({
    date: parseDateToken(dateToken),
    narration,
    amount,
    type: resolvedType,
    balance,
    rawLine,
  });
}

function resolveTypesFromBalanceMovement(transactions) {
  return transactions.map((transaction, index) => {
    if (index === 0) return transaction;
    const previous = transactions[index - 1];
    const delta = Number((transaction.balance - previous.balance).toFixed(2));
    const amount = Number(transaction.amount.toFixed(2));
    if (Math.abs(Math.abs(delta) - amount) > 0.01) return transaction;
    return {
      ...transaction,
      type: delta > 0 ? "credit" : "debit",
    };
  });
}

export function parseBankOfBarodaStatement(rawText = "") {
  const assembledTransactions = [];
  let pendingNarration = "";

  rawText
    .split(/\r?\n/)
    .map(compactStatementLine)
    .forEach((line) => {
      if (!line || isSkippableLine(line)) return;
      if (!/[a-z]/i.test(line) && !hasDateAndAmount(line)) return;

      if (hasDateAndAmount(line)) {
        const rawLine = pendingNarration ? `${pendingNarration} ${line}` : line;
        const transaction = parseTransactionLine(rawLine);
        if (transaction) {
          assembledTransactions.push(transaction);
          pendingNarration = "";
          return;
        }
      }

      if (isLikelyNarrationContinuation(line) && assembledTransactions.length) {
        const lastIndex = assembledTransactions.length - 1;
        assembledTransactions[lastIndex] = appendContinuation(assembledTransactions[lastIndex], line);
        return;
      }

      if (!getMoneyMatches(line).length && (pendingNarration || isLikelyTransactionNarration(line))) {
        pendingNarration = mergeNarrationFragment(pendingNarration, line);
        return;
      }

      if (LINE_START_DATE.test(line) && !hasDateAndAmount(line)) {
        pendingNarration = "";
      }
    });

  const transactions = resolveTypesFromBalanceMovement(assembledTransactions).map(withMerchantDetails);

  const salary = detectSalaryCredit(transactions);
  return transactions.map((transaction) => (
    transaction === salary.transaction ? { ...transaction, isSalary: true } : transaction
  ));
}

export { detectMerchant, detectSalaryCredit };
