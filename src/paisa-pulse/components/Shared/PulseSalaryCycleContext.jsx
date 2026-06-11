import { createContext, useContext } from "react";
import { usePulseSalaryCycle } from "../../hooks/usePulseSalaryCycle";

const PulseSalaryCycleContext = createContext(null);

export function PulseSalaryCycleProvider({ children }) {
  const value = usePulseSalaryCycle();
  return <PulseSalaryCycleContext.Provider value={value}>{children}</PulseSalaryCycleContext.Provider>;
}

export function usePulseSalaryCycleContext() {
  return useContext(PulseSalaryCycleContext);
}
