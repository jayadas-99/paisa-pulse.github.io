const MERCHANT_ALIASES = [
  { patterns: ["swiggyinstamart", "instamart"], merchant: "Swiggy Instamart", category: "Groceries" },
  { patterns: ["swiggy"], merchant: "Swiggy", category: "Food" },
  { patterns: ["zomato"], merchant: "Zomato", category: "Food" },
  { patterns: ["blinkit"], merchant: "Blinkit", category: "Groceries" },
  { patterns: ["zeptoonline", "zepto"], merchant: "Zepto", category: "Groceries" },
  { patterns: ["bigbasket", "bbdaily"], merchant: "BigBasket", category: "Groceries" },
  { patterns: ["jiomart"], merchant: "JioMart", category: "Groceries" },
  { patterns: ["dmart"], merchant: "DMart", category: "Groceries" },
  { patterns: ["rapido"], merchant: "Rapido", category: "Transport" },
  { patterns: ["uber"], merchant: "Uber", category: "Transport" },
  { patterns: ["olacabs", "ola"], merchant: "Ola", category: "Transport" },
  { patterns: ["irctc"], merchant: "IRCTC", category: "Travel" },
  { patterns: ["makemytrip", "mmt"], merchant: "MakeMyTrip", category: "Travel" },
  { patterns: ["airtelpaymentsbank", "airtelpayment", "airtel"], merchant: "Airtel", category: "Bills" },
  { patterns: ["jio"], merchant: "Jio", category: "Bills" },
  { patterns: ["gpayrecharge", "mobilerecharge"], merchant: "Mobile Recharge", category: "Bills" },
  { patterns: ["policybazaar"], merchant: "Policybazaar", category: "Bills" },
  { patterns: ["vodafoneidea", "vimobile", "vil"], merchant: "VI", category: "Bills" },
  { patterns: ["urbancompany", "urbanclap"], merchant: "Urban Company", category: "Household" },
  { patterns: ["pinelabs", "ibkpos"], merchant: "Card/POS Merchant", category: "Shopping" },
  { patterns: ["amazon"], merchant: "Amazon", category: "Shopping" },
  { patterns: ["flipkart"], merchant: "Flipkart", category: "Shopping" },
  { patterns: ["myntra"], merchant: "Myntra", category: "Shopping" },
  { patterns: ["nykaa"], merchant: "Nykaa", category: "Shopping" },
  { patterns: ["netflix"], merchant: "Netflix", category: "Entertainment" },
  { patterns: ["spotify"], merchant: "Spotify", category: "Entertainment" },
  { patterns: ["bookmyshow"], merchant: "BookMyShow", category: "Entertainment" },
  { patterns: ["apollo", "pharmeasy", "netmeds", "medplus", "tata1mg", "1mg"], merchant: "Pharmacy", category: "Health" },
  { patterns: ["gpayrefund", "refund", "cashback", "reversal"], merchant: "Refund", category: "Income" },
  { patterns: ["paytm", "phonepe", "gpay", "googlepay", "ptyes"], merchant: "UPI Transfer", category: "Transfers" },
  { patterns: ["water", "wate"], merchant: "Water Bill", category: "Bills" },
];

function normalizeToken(value = "") {
  return value
    .toLowerCase()
    .replace(/@.*/, "")
    .replace(/\.(payu|okaxis|oksbi|okhdfc|ybl|ibl|axl|ptyes).*/, "")
    .replace(/[-_](online|upi|payu|okaxis|oksbi|okhdfc|ybl|ibl|axl|ptyes).*/, "")
    .replace(/\d+/g, "")
    .replace(/[^a-z]/g, "");
}

function isReferenceToken(value = "") {
  const token = value.toLowerCase();
  return !token
    || token === "upi"
    || token.length < 3
    || /^\d+$/.test(token)
    || /^\d{1,2}:\d{2}(:\d{2})?$/.test(token)
    || /^[q]?\d+@/.test(token)
    || /^[a-z]?\d+$/.test(token);
}

export function extractUpiMerchantToken(narration = "") {
  const parts = narration.split("/").map((part) => part.trim()).filter(Boolean);
  const candidates = [];

  parts.forEach((part, index) => {
    if (part.toLowerCase() === "upi") {
      candidates.push(parts[index + 1], parts[index - 1]);
    }
  });

  const handleCandidate = narration.match(/\/([a-z][a-z0-9._-]{2,}@[a-z0-9]+)/i)?.[1];
  if (handleCandidate) candidates.push(handleCandidate);

  const cleaned = candidates
    .filter(Boolean)
    .map((candidate) => String(candidate).split(/\s+/)[0])
    .filter((candidate) => !isReferenceToken(candidate))
    .map((candidate) => ({
      raw: candidate,
      normalized: normalizeToken(candidate),
    }))
    .filter((candidate) => candidate.normalized.length >= 3);

  return cleaned[0] || null;
}

export function classifyUpiMerchant(narration = "") {
  const extracted = extractUpiMerchantToken(narration);
  const normalizedNarration = normalizeToken(narration);
  const normalized = extracted?.normalized || normalizedNarration;

  const match = MERCHANT_ALIASES.find(({ patterns }) => (
    patterns.some((pattern) => normalized.includes(pattern) || normalizedNarration.includes(pattern))
  ));

  if (match) {
    return {
      merchantRaw: extracted?.raw || match.merchant,
      merchantToken: extracted?.normalized || "",
      merchant: match.merchant,
      category: match.category,
      categorizationSource: "upi-merchant-map",
      categoryConfidence: 0.96,
    };
  }

  if (/upi/i.test(narration) && extracted) {
    return {
      merchantRaw: extracted.raw,
      merchantToken: extracted.normalized,
      merchant: extracted.raw,
      category: "Transfers",
      categorizationSource: "upi-merchant-token",
      categoryConfidence: 0.7,
    };
  }

  return null;
}
