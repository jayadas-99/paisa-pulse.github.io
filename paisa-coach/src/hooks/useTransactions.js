import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { subscribeToPath } from "../services/transactionService";

export function useTransactions(path = "transactions") {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeToPath(user.uid, path, (nextItems) => {
      setItems(nextItems.sort((a, b) => {
        const aKey = a.timestamp || a.generatedAt || a.createdAt || a.uploadedAt || a.date || "";
        const bKey = b.timestamp || b.generatedAt || b.createdAt || b.uploadedAt || b.date || "";
        return typeof aKey === "number" && typeof bKey === "number" ? aKey - bKey : String(aKey).localeCompare(String(bKey));
      }));
      setLoading(false);
    });
  }, [user, path]);

  return { items, loading };
}
