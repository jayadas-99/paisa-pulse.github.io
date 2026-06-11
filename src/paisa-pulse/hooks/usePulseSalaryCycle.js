import { useMemo } from "react";
import { usePulseAuth } from "./usePulseAuth";
import { usePulseTransactions } from "./usePulseTransactions";
import { daysUntilSalary, getBudgetBurnRate, getSalaryCyclePhase, isCurrentMonth } from "../utils/pulseSalaryCycleUtils";

export function usePulseSalaryCycle() {
  const { profile } = usePulseAuth();
  const { items: transactions } = usePulseTransactions("transactions");

  return useMemo(() => {
    const salaryDate = Number(profile?.salaryDate || 1);
    const monthlyIncome = Number(profile?.monthlyIncome || 0);
    const phase = getSalaryCyclePhase(salaryDate);
    const totalSpent = transactions
      .filter((tx) => Number(tx.amount) < 0 && isCurrentMonth(tx.date))
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    return {
      ...phase,
      daysUntilNext: daysUntilSalary(salaryDate),
      burnRate: getBudgetBurnRate(totalSpent, monthlyIncome),
      monthlyIncome,
      totalSpent,
    };
  }, [profile, transactions]);
}
