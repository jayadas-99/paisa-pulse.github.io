import { Navigate, Route, Routes } from "react-router-dom";
import PulseProtectedRoute from "./components/Shared/PulseProtectedRoute";
import PulseDashboard from "./components/Dashboard/PulseDashboard";
import SubscriptionAudit from "./components/Subscriptions/SubscriptionAudit";
import PulseShell from "./components/Layout/PulseShell";
import PulseSettings from "./components/Settings/PulseSettings";
import PulseChat from "./components/Chat/PulseChat";
import PulseUpload from "./components/Upload/PulseUpload";
import PulseTransactions from "./components/Transactions/PulseTransactions";
import PulseSimulator from "./components/Simulator/PulseSimulator";
import PulseRoadmap from "./components/Roadmap/PulseRoadmap";
import PulseDemo from "./components/Demo/PulseDemo";

function PulsePage({ children }) {
  return <PulseProtectedRoute><PulseShell>{children}</PulseShell></PulseProtectedRoute>;
}

export default function PulseApp() {
  return (
    <Routes>
      <Route path="" element={<PulsePage><PulseDashboard /></PulsePage>} />
      <Route path="subscriptions" element={<PulsePage><SubscriptionAudit /></PulsePage>} />
      <Route path="transactions" element={<PulsePage><PulseTransactions /></PulsePage>} />
      <Route path="chat" element={<PulsePage><PulseChat /></PulsePage>} />
      <Route path="upload" element={<PulsePage><PulseUpload /></PulsePage>} />
      <Route path="demo" element={<PulsePage><PulseDemo /></PulsePage>} />
      <Route path="simulator" element={<PulsePage><PulseSimulator /></PulsePage>} />
      <Route path="roadmap" element={<PulsePage><PulseRoadmap /></PulsePage>} />
      <Route path="settings" element={<PulsePage><PulseSettings /></PulsePage>} />
      <Route path="*" element={<Navigate to="/pulse" replace />} />
    </Routes>
  );
}
