import { get, onValue, push, ref, remove, set, update } from "firebase/database";
import { db } from "./firebase";

export function userRef(uid, path = "") {
  return ref(db, `users/${uid}${path ? `/${path}` : ""}`);
}

function cleanForFirebase(value) {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(cleanForFirebase);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce((cleaned, [key, item]) => {
      const cleanValue = cleanForFirebase(item);
      if (cleanValue !== null) cleaned[key] = cleanValue;
      return cleaned;
    }, {});
  }
  return value;
}

export async function saveProfile(uid, profile) {
  await update(userRef(uid, "profile"), cleanForFirebase(profile));
}

export async function getProfile(uid) {
  const snap = await get(userRef(uid, "profile"));
  return snap.exists() ? snap.val() : null;
}

export async function saveTransactions(uid, transactions) {
  const uploadedAt = Date.now();
  await Promise.all(transactions.map((tx) => push(userRef(uid, "transactions"), cleanForFirebase({ ...tx, uploadedAt }))));
}

export async function updateTransactions(uid, transactions) {
  await Promise.all(transactions.map(({ id, ...transaction }) => (
    update(userRef(uid, `transactions/${id}`), cleanForFirebase(transaction))
  )));
}

export async function updateTransaction(uid, transactionId, values) {
  await update(userRef(uid, `transactions/${transactionId}`), cleanForFirebase(values));
}

export async function saveCategoryRule(uid, rule) {
  await update(userRef(uid, `categoryRules/${rule.key}`), cleanForFirebase({
    ...rule,
    updatedAt: Date.now(),
  }));
}

export async function saveNudges(uid, nudges, cyclePhase) {
  const batchId = Date.now();
  await Promise.all(nudges.map((nudge) => push(userRef(uid, "nudges"), cleanForFirebase({
    ...nudge,
    generatedAt: Date.now(),
    batchId,
    isRead: false,
    cyclePhase,
  }))));
}

export async function addGoal(uid, goal) {
  await push(userRef(uid, "goals"), cleanForFirebase({ ...goal, createdAt: Date.now() }));
}

export async function deleteGoal(uid, goalId) {
  await remove(userRef(uid, `goals/${goalId}`));
}

export function subscribeToPath(uid, path, callback) {
  return onValue(userRef(uid, path), (snap) => {
    const value = snap.val();
    if (!value) {
      callback([]);
      return;
    }
    callback(Object.entries(value).map(([id, item]) => ({ id, ...item })));
  });
}

export async function addChatMessage(uid, message) {
  await push(userRef(uid, "chatHistory"), cleanForFirebase({ ...message, timestamp: Date.now() }));
}

export async function clearChat(uid) {
  await remove(userRef(uid, "chatHistory"));
}
