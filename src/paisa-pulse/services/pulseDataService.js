import { get, onValue, push, ref, remove, update } from "firebase/database";
import { db } from "./pulseFirebase";
import { monthKey } from "../utils/pulseCategoryHelpers.js";

export function pulseUserRef(uid, path = "") {
  return ref(db, `pulseUsers/${uid}${path ? `/${path}` : ""}`);
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

export async function savePulseProfile(uid, profile) {
  await update(pulseUserRef(uid, "profile"), cleanForFirebase(profile));
}

export async function getPulseProfile(uid) {
  const snap = await get(pulseUserRef(uid, "profile"));
  return snap.exists() ? snap.val() : null;
}

async function removePulseTransactionsForMonths(uid, months = []) {
  const monthSet = new Set(months.filter(Boolean));
  if (!monthSet.size) return;

  const snap = await get(pulseUserRef(uid, "transactions"));
  const value = snap.val();
  if (!value) return;

  await Promise.all(Object.entries(value)
    .filter(([, transaction]) => monthSet.has(monthKey(transaction.date)))
    .map(([id]) => remove(pulseUserRef(uid, `transactions/${id}`))));
}

export async function savePulseTransactions(uid, transactions, { replaceMonths = [] } = {}) {
  await removePulseTransactionsForMonths(uid, replaceMonths);
  const uploadedAt = Date.now();
  await Promise.all(transactions.map((tx) => push(pulseUserRef(uid, "transactions"), cleanForFirebase({ ...tx, uploadedAt }))));
}

export function subscribeToPulsePath(uid, path, callback) {
  return onValue(pulseUserRef(uid, path), (snap) => {
    const value = snap.val();
    if (!value) {
      callback([]);
      return;
    }
    callback(Object.entries(value).map(([id, item]) => ({ id, ...item })));
  });
}

export async function addPulseChatMessage(uid, message) {
  await push(pulseUserRef(uid, "chatHistory"), cleanForFirebase({ ...message, timestamp: Date.now() }));
}

export async function clearPulseChat(uid) {
  await remove(pulseUserRef(uid, "chatHistory"));
}
