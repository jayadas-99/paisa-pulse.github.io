import { createContext, useContext } from "react";
import { useSalaryCycle } from "../../hooks/useSalaryCycle";

const SalaryCycleContext = createContext(null);

export function SalaryCycleProvider({ children }) {
  const value = useSalaryCycle();
  return <SalaryCycleContext.Provider value={value}>{children}</SalaryCycleContext.Provider>;
}

export function useSalaryCycleContext() {
  return useContext(SalaryCycleContext);
}
