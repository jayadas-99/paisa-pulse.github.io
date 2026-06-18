import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import SalaryCycleBar from "../Dashboard/SalaryCycleBar";
import { SalaryCycleProvider } from "../Shared/SalaryCycleContext";

export default function AppShell({ children }) {
  return (
    <SalaryCycleProvider>
      <div className="min-h-screen bg-paisa-bg">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 p-4 lg:p-6">
            <SalaryCycleBar />
            {children}
          </main>
        </div>
      </div>
    </SalaryCycleProvider>
  );
}
