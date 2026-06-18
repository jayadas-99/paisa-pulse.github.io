import { inferPulseCategory, normalizePulseCategory } from "../utils/pulseCategoryHelpers.js";

const PULSE_CATEGORIES = ["Food", "Groceries", "Subscriptions"];

async function callGroq(messages, temperature = 0.3) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, temperature }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || data?.error || `Groq request failed: ${response.status}`);
  return data.choices?.[0]?.message?.content || "";
}

function parseJson(text) {
  const cleanText = String(text || "").replace(/```(?:json)?|```/gi, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch {
    const match = cleanText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return match ? JSON.parse(match[0]) : null;
  }
}

export async function generatePulseNudges(foodTotal, foodLastMonth, quickTotal, quickLastMonth, subTotal, subLastMonth) {
  try {
    const content = await callGroq([
      {
        role: "system",
        content: "You are Paysa Pulse, a focused financial habit coach.\nYou only care about 3 spending categories: Food Delivery, Quick Commerce, and Subscriptions.\nGiven current and last month totals for each category,\nreturn ONLY a valid JSON object with exactly 3 keys:\nfoodDelivery, quickCommerce, subscriptions.\nEach value is a single nudge sentence, maximum 12 words, non-judgmental, specific to the numbers given.\nNo markdown, no explanation, only JSON.",
      },
      { role: "user", content: JSON.stringify({ foodTotal, foodLastMonth, quickTotal, quickLastMonth, subTotal, subLastMonth }) },
    ]);
    const parsed = parseJson(content);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function localPulseCategory(transaction) {
  return inferPulseCategory(transaction);
}

function merchantName(transaction) {
  return transaction.merchant || transaction.description || "Unknown";
}

function hasPulseCategory(transaction) {
  return PULSE_CATEGORIES.includes(normalizePulseCategory(transaction.category));
}

export async function categorizePulseTransactions(transactions = []) {
  const locallyCategorized = transactions.map((transaction) => ({
    ...transaction,
    category: normalizePulseCategory(localPulseCategory(transaction)),
    merchant: merchantName(transaction),
    categorizationSource: transaction.categorizationSource || "pulse-local",
    categoryConfidence: transaction.categoryConfidence || (PULSE_CATEGORIES.includes(normalizePulseCategory(localPulseCategory(transaction))) ? 0.9 : 0.2),
  }));

  try {
    const candidates = locallyCategorized
      .map((transaction, index) => ({
        index,
        date: transaction.date,
        description: transaction.description,
        merchant: transaction.merchant,
        amount: transaction.amount,
        localCategory: transaction.category,
      }))
      .filter((transaction) => Number(transaction.amount) < 0)
      .filter((transaction) => !PULSE_CATEGORIES.includes(normalizePulseCategory(transaction.localCategory)))
      .slice(0, 80);

    if (!candidates.length) return locallyCategorized;

    const content = await callGroq([
      {
        role: "system",
        content: "You are Paysa Pulse's categorizer. Classify Indian bank transactions into ONLY these categories: Food, Groceries, Subscriptions, Other. Food means restaurant/food delivery. Groceries means quick commerce or grocery delivery. Subscriptions means recurring bills, streaming, telecom, app subscriptions, autopay, mandates. Return ONLY a valid JSON array of { index:number, merchant:string, category:string }.",
      },
      { role: "user", content: JSON.stringify(candidates) },
    ], 0.1);
    const parsed = parseJson(content);
    if (!Array.isArray(parsed)) return locallyCategorized;

    return locallyCategorized.map((transaction, index) => {
      if (hasPulseCategory(transaction)) return transaction;
      const match = parsed.find((item) => Number(item.index) === index);
      if (!match?.category) return transaction;
      const aiCategory = normalizePulseCategory(match.category);
      if (!PULSE_CATEGORIES.includes(aiCategory)) return transaction;
      return {
        ...transaction,
        category: aiCategory,
        merchant: match.merchant || transaction.merchant,
        categorizationSource: "pulse-groq",
      };
    });
  } catch {
    return locallyCategorized;
  }
}
