import PulseSidebar from "./PulseSidebar";
import { usePulseTheme } from "../../context/PulseThemeContext";
import { PulseSalaryCycleProvider } from "../Shared/PulseSalaryCycleContext";

export default function PulseShell({ children }) {
  usePulseTheme();

  return (
    <div className="min-h-screen bg-paisa-bg text-paisa-text">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <PulseSidebar />
        <main className="flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-8">
          <PulseSalaryCycleProvider>{children}</PulseSalaryCycleProvider>
        </main>
      </div>
    </div>
  );
}
