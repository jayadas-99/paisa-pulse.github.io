export function merchantRuleKey(transaction = {}) {
  const raw = transaction.merchantRaw || transaction.description || transaction.rawLine || transaction.merchant || "";
  const lower = raw.toLowerCase();
  const upiPart = lower.match(/\/upi\/([^/\s]+)/)?.[1]
    || lower.match(/upi\/([^/\s]+)/)?.[1]
    || lower.match(/([a-z0-9._-]+@[a-z]+)/)?.[1];
  const cleaned = (upiPart || transaction.merchant || lower)
    .replace(/[^a-z0-9@._-]/g, "")
    .slice(0, 80);
  return cleaned || "unknown";
}

export function applyMerchantRule(transaction, rules = []) {
  const key = merchantRuleKey(transaction);
  const rule = rules.find((item) => item.key === key);
  if (!rule) return null;
  return {
    ...transaction,
    category: rule.category,
    merchant: rule.merchant || transaction.merchant,
    categorizationSource: "user-rule",
    categoryConfidence: 1,
    categoryRuleKey: key,
  };
}
