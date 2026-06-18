import { preclassifyMerchant } from "../utils/indiaMerchantMap";
import { applyMerchantRule } from "../utils/merchantRules";
import { classifyUpiMerchant } from "../utils/upiMerchant.js";

const CATEGORY_NORMALIZATION = {
  "Food Delivery": "Food",
  Transfer: "Transfers",
  Investment: "Savings",
  Investments: "Savings",
  Utilities: "Bills",
  SalaryCredit: "Salary",
  Paycheck: "Salary",
};

function normalizeCategory(category) {
  return category ? (CATEGORY_NORMALIZATION[category] || category) : null;
}

function formatRupee(value = 0) {
  return `₹${Math.round(Number(value || 0)).toLocaleString("en-IN")}`;
}

function summarize(transactions = []) {
  const expenses = transactions.filter((tx) => Number(tx.amount) < 0);
  const income = transactions.filter((tx) => Number(tx.amount) > 0);
  const spent = expenses.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
  const earned = income.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const byCategory = expenses.reduce((acc, tx) => {
    const category = normalizeCategory(tx.category) || "Other";
    acc[category] = (acc[category] || 0) + Math.abs(Number(tx.amount));
    return acc;
  }, {});
  const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0] || ["Other", 0];
  const topExpense = expenses.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)))[0];
  return { spent, earned, savings: earned - spent, byCategory, topCategory, topExpense };
}

function enrichedDescription(tx) {
  return [tx.description, tx.merchant, tx.merchantRaw, tx.rawLine].filter(Boolean).join(" ");
}

function classifyByRules(tx) {
  const description = enrichedDescription(tx);
  const lower = description.toLowerCase();
  const upiMerchant = classifyUpiMerchant(description);
  if (upiMerchant) {
    return {
      category: normalizeCategory(upiMerchant.category),
      source: upiMerchant.categorizationSource,
      confidence: upiMerchant.categoryConfidence,
      merchant: upiMerchant.merchant,
      merchantRaw: upiMerchant.merchantRaw,
      merchantToken: upiMerchant.merchantToken,
    };
  }
  const mapped = preclassifyMerchant(description);
  if (mapped) return { category: normalizeCategory(mapped), source: "rules", confidence: 0.92 };

  if (/(upi|imps|neft|rtgs)/i.test(description)) {
    if (/refund|cashback|reversal/.test(lower) || Number(tx.amount) > 0) {
      return { category: "Income", source: "upi-credit", confidence: 0.82 };
    }

    if (/\/q\d+@|\/\d[\d-]{7,}@|@\w+|@ybl|@ibl|@oksbi|@okhdfc|@paytm|@ptyes|@axl|@upi/.test(lower)) {
      return { category: "Transfers", source: "upi-transfer", confidence: 0.72 };
    }
  }

  if (/atm|cash withdrawal|cash wdl/.test(lower)) {
    return { category: "Transfers", source: "cash-transfer", confidence: 0.78 };
  }

  return null;
}

function hasBillSignal(description = "") {
  return /(airtel|jio|vi\b|vodafone|bsnl|electric|electricity|water|\/wate|gas|broadband|wifi|internet|emi|loan|insurance|recharge|bill|bescom|msedcl|mahadiscom|torrent|act|hathway|excitel)/i.test(description);
}

function isAmbiguousUpi(description = "") {
  return /(upi|@\w+|@ybl|@ibl|@oksbi|@okhdfc|@paytm|@ptyes|@axl|\/q\d+@|\/\d[\d-]{7,}@)/i.test(description);
}

function postProcessAiCategory(tx, aiCategory) {
  const description = enrichedDescription(tx);
  if (tx.isSalary) return "Salary";

  const category = normalizeCategory(aiCategory);
  if (!category) return null;

  if (/bank of baroda transaction/i.test(description) && category === "Bills" && !hasBillSignal(description)) {
    return "Other";
  }

  if ((category === "Bills" || category === "Other") && isAmbiguousUpi(description) && !hasBillSignal(description)) {
    return "Transfers";
  }

  return category;
}

function localNudges(transactions = [], salaryCyclePhase = {}) {
  const summary = summarize(transactions);
  if (!transactions.length) {
    return [
      { title: "Upload First", message: "Once your statement is in, I can spot where the money is moving. Start with one month of transactions and we will make sense of it together.", type: "tip", emoji: "📤" },
      { title: "CSV Or PDF", message: "You can use CSV, HDFC PDF, or Bank of Baroda PDF. The parsing happens locally before anything is saved.", type: "insight", emoji: "🔒" },
      { title: "Salary Cycle Ready", message: "Your salary date powers the whole coaching rhythm. Keep it updated so Day 1 and Day 25 feel different in the app.", type: "tip", emoji: "📅" },
      { title: "No Upsells", message: "This app stays focused on coaching, not selling credit cards or loans. Clean money clarity, that is the whole play.", type: "achievement", emoji: "💚" },
    ];
  }

  const [topCategory, topAmount] = summary.topCategory;
  const biggest = summary.topExpense;
  const phase = salaryCyclePhase.phase || "steady";
  const phaseLine = phase === "survival"
    ? "Keep it essentials-first until salary day."
    : phase === "careful"
      ? "A small pause on flexible spends will help."
      : "Good time to set the tone for the month.";

  return [
    {
      title: "Top Spend Signal",
      message: `${topCategory} is your biggest category at ${formatRupee(topAmount)}. ${phaseLine}`,
      type: topAmount > summary.spent * 0.4 ? "warning" : "insight",
      emoji: "📊",
    },
    {
      title: "Month Snapshot",
      message: `You have spent ${formatRupee(summary.spent)} against income of ${formatRupee(summary.earned)} in this data. Use this as a quick money mirror, not a guilt trip.`,
      type: summary.savings >= 0 ? "achievement" : "tip",
      emoji: summary.savings >= 0 ? "💚" : "🧭",
    },
    {
      title: "Biggest Transaction",
      message: biggest ? `${biggest.description} was the largest debit at ${formatRupee(Math.abs(biggest.amount))}. If it was planned, count it as handled and move on.` : "No debits found in this upload yet. That is either peaceful or the parser needs another look.",
      type: "insight",
      emoji: "🔎",
    },
    {
      title: "Next Tiny Move",
      message: `Pick one category to keep light for the next 3 days. Tiny control beats dramatic budgeting every time.`,
      type: "tip",
      emoji: "✨",
    },
  ];
}

function localChatReply(userMessage = "", transactions = [], salaryCyclePhase = {}) {
  const summary = summarize(transactions);
  const lower = userMessage.toLowerCase();
  const categoryMatch = Object.keys(summary.byCategory).find((category) => lower.includes(category.toLowerCase()));

  if (!transactions.length) {
    return "I do not see saved transactions yet. Upload and confirm a statement first, then I can answer with real ₹ amounts from your data.";
  }

  if (lower.includes("food")) {
    const food = (summary.byCategory.Food || 0) + (summary.byCategory["Food Delivery"] || 0);
    return `You spent ${formatRupee(food)} on food-related transactions in the uploaded data. If that feels high, try trimming just one delivery order this week, no guilt spiral needed.`;
  }

  if (categoryMatch) {
    return `You spent ${formatRupee(summary.byCategory[categoryMatch])} on ${categoryMatch}. That is the clearest number I see for that category in your uploaded transactions.`;
  }

  if (lower.includes("save") || lower.includes("track")) {
    return `In this upload, income is ${formatRupee(summary.earned)} and spending is ${formatRupee(summary.spent)}, so net savings show as ${formatRupee(summary.savings)}. You are in ${salaryCyclePhase.label || "your current salary cycle phase"}, so use this as a check-in, not a lecture.`;
  }

  if (lower.includes("where") || lower.includes("most") || lower.includes("biggest")) {
    const [topCategory, topAmount] = summary.topCategory;
    return `Most of your money is going to ${topCategory}: ${formatRupee(topAmount)} in the uploaded data. Biggest single debit was ${summary.topExpense?.description || "not clear"} at ${formatRupee(Math.abs(summary.topExpense?.amount || 0))}.`;
  }

  return `I can see ${transactions.length} saved transactions. Total spend is ${formatRupee(summary.spent)}, income is ${formatRupee(summary.earned)}, and the top category is ${summary.topCategory[0]} at ${formatRupee(summary.topCategory[1])}.`;
}

async function callGroq(messages, temperature = 0.4) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, temperature }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Groq request failed: ${response.status}`);
  return data.choices?.[0]?.message?.content || "";
}

function parseJson(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    return match ? JSON.parse(match[0]) : fallback;
  }
}

function mergeAiCategory(tx, aiMatch) {
  const aiCategory = postProcessAiCategory(tx, aiMatch?.category);
  if (!aiCategory) return tx;
  return {
    ...tx,
    category: aiCategory,
    merchant: aiMatch?.merchant || tx.merchant,
    categoryConfidence: Number(aiMatch?.confidence || 0.75),
    categorizationSource: "groq",
    categorizationReason: aiMatch?.reason || "",
  };
}

function hasTrustedLocalCategory(tx) {
  const trustedSources = ["upi-merchant-map", "bank-rule", "rules", "user-rule", "salary-detection"];
  return tx.category
    && !["Other", "Transfers"].includes(tx.category)
    && Number(tx.categoryConfidence || 0) >= 0.9
    && trustedSources.includes(tx.categorizationSource);
}

async function categorizeWithAI(transactions = []) {
  if (!transactions.length) return [];
  const chunks = [];
  for (let index = 0; index < transactions.length; index += 35) {
    chunks.push(transactions.slice(index, index + 35));
  }

  const categorized = [];
  for (const chunk of chunks) {
    const content = await callGroq([
      {
        role: "system",
        content: `You are Paysa Coach's transaction categorization engine for Indian bank statements.
Return ONLY a valid JSON array. Each item must have:
{ index: number, merchant: string, category: string, confidence: number, reason: string }

Allowed categories:
Food, Groceries, Transport, Shopping, Entertainment, Bills, Rent, Household, Personal Care, Health, Travel, Education, Transfers, Savings, Salary, Income, Other.

Use the FULL raw bank narration, UPI handle, merchantRaw, and amount.
Important India rules:
- Swiggy restaurant orders = Food.
- Swiggy Instamart = Groceries.
- Zomato = Food.
- Blinkit, Zepto, BigBasket, JioMart, DMart = Groceries.
- Rapido, Ola, Uber, metro, fuel, FASTag = Transport.
- Airtel, Jio, electricity, gas, water, broadband, mobile recharge = Bills.
- Rent paid to landlord/broker = Rent.
- Urban Company, repair, cleaning, appliance service, home service = Household.
- Salon, beauty, grooming, cosmetics service = Personal Care.
- Amazon, Flipkart, Myntra, Nykaa, Ajio, Pine Labs retail/card POS = Shopping.
- Netflix, Spotify, BookMyShow, Hotstar = Entertainment.
- Apollo, pharmacy, hospital, diagnostic = Health.
- IRCTC, flights, hotels, bus tickets = Travel.
- Salary/payroll/monthly salary credit = Salary. Never categorize salary as Food, Bills, Shopping, or Other.
- Refund, cashback, reversal, interest, claim payout = Income.
- FD, fixed deposit, RD, recurring deposit, self-transfer to savings/investment = Savings.
- Unknown UPI to phone numbers, q-codes, @ybl/@ibl/@paytm/@ptyes/person handles = Transfers, NOT Bills and NOT Other.
- Use Other only if the narration has no usable clue.
- Do not overuse Bills. Bills should only be actual utilities, rent/EMI/insurance, subscriptions, recharges, or household services.`,
      },
      {
        role: "user",
        content: JSON.stringify(chunk.map((tx) => ({
          index: tx._index,
          date: tx.date,
          amount: tx.amount,
          description: tx.description,
          merchant: tx.merchant,
          merchantRaw: tx.merchantRaw,
          rawLine: tx.rawLine,
          balance: tx.balance,
          parsedType: Number(tx.amount) >= 0 ? "credit" : "debit",
        }))),
      },
    ], 0.1);

    const parsed = parseJson(content, []);
    if (Array.isArray(parsed)) categorized.push(...parsed);
  }

  return categorized;
}

export async function categorizeTransactions(transactions = [], { force = false, preferAi = true, userRules = [] } = {}) {
  const prepared = transactions.map((tx, index) => {
    if (tx.isSalary) {
      return {
        ...tx,
        _index: index,
        category: "Salary",
        merchant: "Salary",
        categorizationSource: "salary-detection",
        categoryConfidence: 1,
      };
    }
    const userRuled = applyMerchantRule(tx, userRules);
    if (userRuled) {
      return { ...userRuled, _index: index };
    }
    const normalizedExisting = tx.category ? normalizeCategory(tx.category) : null;
    const existingCategory = !force && normalizedExisting && normalizedExisting !== "Other" ? normalizedExisting : null;
    const rule = existingCategory ? null : classifyByRules(tx);
    return {
      ...tx,
      _index: index,
      category: existingCategory || rule?.category || null,
      merchant: rule?.merchant || tx.merchant,
      merchantRaw: rule?.merchantRaw || tx.merchantRaw,
      merchantToken: rule?.merchantToken || tx.merchantToken,
      categorizationSource: tx.categorizationSource || (existingCategory ? "existing" : rule?.source),
      categoryConfidence: tx.categoryConfidence || (existingCategory ? 1 : rule?.confidence),
    };
  });

  if (preferAi) {
    try {
      const aiClassified = await categorizeWithAI(prepared);
      return prepared.map((tx, index) => {
        if (tx.categorizationSource === "user-rule") {
          return {
            ...tx,
            date: tx.date,
            description: tx.description,
            amount: Number(tx.amount),
          };
        }
        if (hasTrustedLocalCategory(tx)) {
          return {
            ...tx,
            date: tx.date,
            description: tx.description,
            amount: Number(tx.amount),
          };
        }
        const aiMatch = aiClassified.find((item) => Number(item.index) === tx._index) || aiClassified[index];
        const aiMerged = mergeAiCategory(tx, aiMatch);
        if (aiMerged.category) return {
          ...aiMerged,
          date: tx.date,
          description: tx.description,
          amount: Number(tx.amount),
        };
        return {
          ...tx,
          date: tx.date,
          description: tx.description,
          amount: Number(tx.amount),
          category: tx.category || "Other",
          categorizationSource: tx.categorizationSource || "fallback",
          categoryConfidence: tx.categoryConfidence || 0.2,
        };
      });
    } catch {
      // Fall through to rules + limited AI for unresolved rows.
    }
  }

  const unclassified = prepared.filter((tx) => !tx.category);
  let groqClassified = [];

  if (unclassified.length) {
    try {
      const content = await callGroq([
        {
          role: "system",
          content: "You are a financial transaction categorizer for Indian users. Return ONLY a valid JSON array where each item has: index (number), merchant (string), category (one of: Food, Transport, Shopping, Entertainment, Bills, Rent, Household, Personal Care, Health, Travel, Education, Groceries, Transfers, Savings, Salary, Income, Other), confidence (number), reason (string). Salary/payroll/monthly salary credit=Salary and must never be Food/Bills/Shopping. Swiggy=Food, Swiggy Instamart/Blinkit/Zepto/BigBasket=Groceries, Airtel/Jio/electricity/water=Bills, Urban Company/repair/cleaning=Household, salon/beauty=Personal Care, PineLabs/Amazon/Flipkart/Myntra=Shopping, FD=fixed deposit=Savings. Refund/cashback/reversal/interest/claims=Income. Unknown UPI handles to people/phone numbers/q-codes should be Transfers, not Bills. Do not overuse Bills. No explanation, no markdown, pure JSON array.",
        },
        { role: "user", content: JSON.stringify(unclassified.map(({ _index, date, description, merchant, merchantRaw, rawLine, amount, balance }) => ({ index: _index, date, description, merchant, merchantRaw, rawLine, amount, balance }))) },
      ]);
      groqClassified = parseJson(content, []);
    } catch {
      groqClassified = unclassified.map((tx) => ({ ...tx, category: "Other" }));
    }
  }

  return prepared.map((tx) => {
    const aiMatch = groqClassified.find((item) => Number(item.index) === tx._index)
      || (unclassified.includes(tx) ? groqClassified[unclassified.indexOf(tx)] : null);
    return {
      ...tx,
      date: tx.date,
      description: tx.description,
      amount: Number(tx.amount),
      category: normalizeCategory(tx.category) || postProcessAiCategory(tx, aiMatch?.category) || "Other",
      merchant: aiMatch?.merchant || tx.merchant,
      categorizationSource: tx.categorizationSource || (aiMatch?.category ? "groq" : "fallback"),
      categoryConfidence: tx.categoryConfidence || (aiMatch?.category ? 0.65 : 0.2),
      categorizationReason: aiMatch?.reason || tx.categorizationReason || "",
    };
  });
}

export async function generateNudges(categorizedTransactions = [], goals = [], salaryCyclePhase = {}) {
  try {
    const content = await callGroq([
      {
        role: "system",
        content: `You are Paysa Coach — a personal finance bestie for young salaried Indians. Your tone is casual, direct, warm, and never preachy or guilt-trippy. You sound like a financially sorted friend texting them. Use Indian context (₹, Swiggy, UPI, salary cycle). The user is currently in the '${salaryCyclePhase.label}' phase of their salary cycle (${salaryCyclePhase.daysIn} days since salary). Generate exactly 4 nudge objects as a pure JSON array, each with: { title: string (max 8 words, punchy), message: string (2-3 sentences, conversational, specific with ₹ amounts, ends with an actionable suggestion or positive reframe), type: 'warning' | 'tip' | 'achievement' | 'insight', emoji: string }. Adapt tone to cycle phase: 'flush' = encouraging and goal-focused; 'steady' = balanced check-in; 'careful' = gentle heads-up; 'survival' = supportive survival tips only, no investment talk. No markdown, pure JSON array only.`,
      },
      { role: "user", content: JSON.stringify({ transactions: categorizedTransactions.slice(-30), goals, cyclePhase: salaryCyclePhase }) },
    ]);
    const nudges = parseJson(content, localNudges(categorizedTransactions, salaryCyclePhase));
    return Array.isArray(nudges) ? nudges.slice(0, 4) : localNudges(categorizedTransactions, salaryCyclePhase);
  } catch {
    return localNudges(categorizedTransactions, salaryCyclePhase);
  }
}

export async function chatWithData(userMessage, conversationHistory = [], transactions = [], salaryCyclePhase = {}) {
  const summary = transactions.slice(-80).map(({ date, description, amount, category }) => ({ date, description, amount, category }));
  try {
    const content = await callGroq([
      {
        role: "system",
        content: `You are Paysa Coach, a friendly personal finance assistant for young salaried Indians. The user's transaction data is provided. Answer questions about their spending conversationally, with specific ₹ amounts from their data. Keep answers short (2-4 sentences). Use a warm, casual tone — like a knowledgeable friend. Never recommend specific financial products. Never be preachy.\nCycle phase: ${salaryCyclePhase.label || "Unknown"}.\nTransactions: ${JSON.stringify(summary)}`,
      },
      ...conversationHistory.map(({ role, content: text }) => ({ role, content: text })),
      { role: "user", content: userMessage },
    ], 0.3);
    return content.trim();
  } catch {
    return localChatReply(userMessage, transactions, salaryCyclePhase);
  }
}

export async function generateWeeklyCard(transactions = [], salaryCyclePhase = {}) {
  try {
    const content = await callGroq([
      {
        role: "system",
        content: "Analyse this week's transactions for a young Indian professional. Return ONLY a JSON object with: { headline: string (punchy 5-7 word summary of their week), topCategory: string, topCategoryAmount: number, vsLastWeek: string ('up X%' or 'down X%' or 'same as'), savingsMessage: string (one encouraging sentence), badge: string (an achievement badge name if earned, e.g. 'Swiggy Slayer 🔥' or 'Saver of the Week 💚' or null) }. Pure JSON only.",
      },
      { role: "user", content: JSON.stringify({ transactions, salaryCyclePhase }) },
    ]);
    return parseJson(content, null);
  } catch {
    return null;
  }
}
