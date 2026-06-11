import { Navigate, Route, Routes } from "react-router-dom";
import PulseLoginPage from "./paisa-pulse/components/Auth/PulseLoginPage";
import PulseSignupPage from "./paisa-pulse/components/Auth/PulseSignupPage";
import PulseApp from "./paisa-pulse/PulseApp";
import { usePulseAuth } from "./paisa-pulse/hooks/usePulseAuth";
import PulseSetupRequired from "./paisa-pulse/components/Shared/PulseSetupRequired";

export default function App() {
  const { user, firebaseReady } = usePulseAuth();
  if (!firebaseReady) return <PulseSetupRequired />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/pulse" : "/login"} replace />} />
      <Route path="/login" element={<PulseLoginPage />} />
      <Route path="/signup" element={<PulseSignupPage />} />
      <Route path="/pulse/*" element={<PulseApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
