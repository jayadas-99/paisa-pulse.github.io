import { useEffect, useState } from "react";
import { usePulseAuth } from "./usePulseAuth";
import { subscribeToPulsePath } from "../services/pulseDataService";

export function usePulseTransactions(path = "transactions") {
  const { user } = usePulseAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return subscribeToPulsePath(user.uid, path, (nextItems) => {
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
