import { Navigate } from "react-router-dom";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import PulseLoadingSpinner from "./PulseLoadingSpinner";

export default function PulseProtectedRoute({ children }) {
  const { user, loading } = usePulseAuth();
  if (loading) return <PulseLoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
