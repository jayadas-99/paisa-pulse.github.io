export function getSalaryCyclePhase(salaryDate = 1) {
  const today = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  let daysSinceSalary = today - Number(salaryDate || 1);
  if (daysSinceSalary < 0) daysSinceSalary += daysInMonth;
  const cyclePercent = Math.round((daysSinceSalary / daysInMonth) * 100);

  if (cyclePercent <= 25) return { phase: "flush", label: "Fresh Start 🟢", color: "#4ade80", daysIn: daysSinceSalary, cyclePercent };
  if (cyclePercent <= 55) return { phase: "steady", label: "Mid Month 🟡", color: "#facc15", daysIn: daysSinceSalary, cyclePercent };
  if (cyclePercent <= 80) return { phase: "careful", label: "Careful Zone 🟠", color: "#fb923c", daysIn: daysSinceSalary, cyclePercent };
  return { phase: "survival", label: "Survival Mode 🔴", color: "#f87171", daysIn: daysSinceSalary, cyclePercent };
}

export function daysUntilSalary(salaryDate = 1) {
  const today = new Date();
  const nextSalary = new Date(today.getFullYear(), today.getMonth(), Number(salaryDate || 1));
  if (nextSalary <= today) nextSalary.setMonth(nextSalary.getMonth() + 1);
  return Math.ceil((nextSalary - today) / (1000 * 60 * 60 * 24));
}

export function getBudgetBurnRate(totalSpent, monthlyIncome) {
  if (!monthlyIncome || monthlyIncome === 0) return 0;
  return Math.min(Math.round((Number(totalSpent || 0) / Number(monthlyIncome)) * 100), 100);
}

export function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isCurrentMonth(dateString) {
  return String(dateString || "").startsWith(getCurrentMonthKey());
}
