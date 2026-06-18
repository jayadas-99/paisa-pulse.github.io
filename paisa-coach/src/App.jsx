import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./components/Auth/LoginPage";
import SignupPage from "./components/Auth/SignupPage";
import DashboardPage from "./components/Dashboard/DashboardPage";
import UploadPage from "./components/Upload/UploadPage";
import NudgesPage from "./components/Nudges/NudgesPage";
import GoalsPage from "./components/Goals/GoalsPage";
import ChatPage from "./components/Chat/ChatPage";
import SettingsPage from "./components/Settings/SettingsPage";
import TransactionsPage from "./components/Transactions/TransactionsPage";
import ProtectedRoute from "./components/Shared/ProtectedRoute";
import AppShell from "./components/Layout/AppShell";
import { useAuth } from "./hooks/useAuth";
import SetupRequired from "./components/Shared/SetupRequired";

function ProtectedPage({ children }) {
  return <ProtectedRoute><AppShell>{children}</AppShell></ProtectedRoute>;
}

export default function App() {
  const { user, firebaseReady } = useAuth();
  if (!firebaseReady) return <SetupRequired />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
      <Route path="/upload" element={<ProtectedPage><UploadPage /></ProtectedPage>} />
      <Route path="/transactions" element={<ProtectedPage><TransactionsPage /></ProtectedPage>} />
      <Route path="/nudges" element={<ProtectedPage><NudgesPage /></ProtectedPage>} />
      <Route path="/goals" element={<ProtectedPage><GoalsPage /></ProtectedPage>} />
      <Route path="/chat" element={<ProtectedPage><ChatPage /></ProtectedPage>} />
      <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
