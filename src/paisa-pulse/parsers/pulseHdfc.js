import { classifyUpiMerchant } from "../utils/pulseUpiMerchant.js";

const LINE_START_DATE = /^\d{2}\/\d{2}\/\d{2}/;
const DATE_TOKEN = /\d{2}\/\d{2}\/\d{2}/g;
const MONEY_TOKEN = /\d{1,3}(?:,\d{2,3})*(?:\.\d{2})|\d+(?:\.\d{2})/g;

const MERCHANT_LOOKUP = [
  { keyword: "SWIGGYINSTAMART", merchant: "Swiggy Instamart", category: "Groceries" },
  { keyword: "INSTAMART", merchant: "Swiggy Instamart", category: "Groceries" },
  { keyword: "SWIGGY", merchant: "Swiggy", category: "Food Delivery" },
  { keyword: "ZOMATO", merchant: "Zomato", category: "Food Delivery" },
  { keyword: "BLINKIT", merchant: "Blinkit", category: "Groceries" },
  { keyword: "ZEPTO", merchant: "Zepto", category: "Groceries" },
  { keyword: "ZEPTOONLINE", merchant: "Zepto", category: "Groceries" },
  { keyword: "BIGBASKET", merchant: "BigBasket", category: "Groceries" },
  { keyword: "RAPIDO", merchant: "Rapido", category: "Transport" },
  { keyword: "OLA", merchant: "Ola", category: "Transport" },
  { keyword: "UBER", merchant: "Uber", category: "Transport" },
  { keyword: "IRCTC", merchant: "IRCTC", category: "Travel" },
  { keyword: "MAKEMYTRIP", merchant: "MakeMyTrip", category: "Travel" },
  { keyword: "NETFLIX", merchant: "Netflix", category: "Entertainment" },
  { keyword: "SPOTIFY", merchant: "Spotify", category: "Entertainment" },
  { keyword: "BOOKMYSHOW", merchant: "BookMyShow", category: "Entertainment" },
  { keyword: "AMAZON", merchant: "Amazon", category: "Shopping" },
  { keyword: "FLIPKART", merchant: "Flipkart", category: "Shopping" },
  { keyword: "MYNTRA", merchant: "Myntra", category: "Shopping" },
  { keyword: "AIRTELPAYMENT", merchant: "Airtel", category: "Bills" },
  { keyword: "AIRTEL", merchant: "Airtel", category: "Bills" },
  { keyword: "/WATE", merchant: "Water Bill", category: "Bills" },
  { keyword: "WATER", merchant: "Water Bill", category: "Bills" },
  { keyword: "URBANCOMPANY", merchant: "Urban Company", category: "Household" },
  { keyword: "PINELABS", merchant: "Pine Labs", category: "Shopping" },
  { keyword: "PINE LABS", merchant: "Pine Labs", category: "Shopping" },
  { keyword: "PAYTM", merchant: "Paytm", category: "Other" },
  { keyword: "GPAYREFUND", merchant: "Google Pay Refund", category: "Income" },
  { keyword: "GPAY", merchant: "Google Pay", category: "Other" },
  { keyword: "SALARY", merchant: "Salary", category: "Salary" },
  { keyword: "NEFT CR SALARY", merchant: "Salary", category: "Salary" },
  { keyword: "NEFT CR", merchant: "Income", category: "Income" },
];

function parseDateToken(value) {
  const [day, month, year] = value.split("/").map(Number);
  return new Date(2000 + year, month - 1, day);
}

function parseMoney(value) {
  return Number.parseFloat(String(value || "").replace(/,/g, ""));
}

function isSkippableLine(line) {
  const upper = line.toUpperCase();
  return !line.trim()
    || upper.includes("OPENING BALANCE")
    || upper.includes("CLOSING BALANCE")
    || upper.includes("STATEMENT SUMMARY")
    || upper.includes("TOTAL")
    || upper.includes("DATE NARRATION")
    || upper.includes("WITHDRAWAL")
    || upper.includes("DEPOSIT");
}

export function detectMerchant(narration = "") {
  const upiMerchant = classifyUpiMerchant(narration);
  if (upiMerchant) return upiMerchant;
  const upper = narration.toUpperCase();
  const match = MERCHANT_LOOKUP.find(({ keyword }) => upper.includes(keyword));
  return match ? { merchant: match.merchant, category: match.category } : { merchant: "Other", category: "Other" };
}

function parseTransactionLine(rawLine) {
  const line = rawLine.trim();
  const compactLine = line.replace(/\s+/g, " ");
  if (isSkippableLine(compactLine) || !LINE_START_DATE.test(compactLine)) return null;

  const dates = [...compactLine.matchAll(DATE_TOKEN)].map((match) => match[0]);
  if (dates.length < 2) return null;

  const firstDate = dates[0];
  const valueDate = dates[1];
  const rowMatch = compactLine.match(/^(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+\S{6,}\s+(\d{2}\/\d{2}\/\d{2})\s+(.+)$/);
  if (!rowMatch) return null;

  const narration = rowMatch[2].trim();
  const valueDateIndex = line.indexOf(valueDate, line.indexOf(firstDate) + firstDate.length);
  const afterValueDate = valueDateIndex === -1
    ? rowMatch[4]
    : line.slice(valueDateIndex + valueDate.length);
  const amountTokens = afterValueDate.match(MONEY_TOKEN) || [];
  if (amountTokens.length < 2) return null;

  const balance = parseMoney(amountTokens[amountTokens.length - 1]);
  const amount = parseMoney(amountTokens[amountTokens.length - 2]);
  if (!Number.isFinite(amount) || !Number.isFinite(balance)) return null;

  const amountIndex = afterValueDate.indexOf(amountTokens[amountTokens.length - 2]);
  const gapBeforeAmount = amountIndex >= 0 ? afterValueDate.slice(0, amountIndex) : "";
  const type = gapBeforeAmount.length >= 4 ? "credit" : "debit";

  return {
    date: parseDateToken(firstDate),
    narration,
    amount,
    type,
    balance,
    rawLine,
    ...detectMerchant(narration),
  };
}

export function detectSalaryCredit(transactions = []) {
  const credits = transactions.filter((transaction) => transaction.type === "credit");
  if (!credits.length) return { transaction: null, salaryDate: null, salaryAmount: 0 };

  const salaryTransaction = credits.reduce((largest, transaction) => (
    transaction.amount > largest.amount ? transaction : largest
  ), credits[0]);
  salaryTransaction.isSalary = true;
  salaryTransaction.merchant = "Salary";
  salaryTransaction.category = "Salary";
  salaryTransaction.categorizationSource = "salary-detection";
  salaryTransaction.categoryConfidence = 1;

  return {
    transaction: salaryTransaction,
    salaryDate: salaryTransaction.date.getDate(),
    salaryAmount: salaryTransaction.amount,
  };
}

export function parseHDFCStatement(rawText = "") {
  const transactions = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => LINE_START_DATE.test(line) && !isSkippableLine(line))
    .map(parseTransactionLine)
    .filter(Boolean);

  const salary = detectSalaryCredit(transactions);
  return transactions.map((transaction) => (
    transaction === salary.transaction ? { ...transaction, isSalary: true } : transaction
  ));
}
