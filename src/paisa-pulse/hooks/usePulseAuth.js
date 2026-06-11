import { useContext } from "react";
import { PulseAuthContext } from "../context/PulseAuthContext";

export function usePulseAuth() {
  return useContext(PulseAuthContext);
}
