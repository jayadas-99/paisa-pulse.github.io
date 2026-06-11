import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { AuthFrame } from "./PulseLoginPage";
import { friendlyAuthError } from "../../utils/pulseAuthErrors";

export default function PulseSignupPage() {
  const { user, signup, loginWithGoogle } = usePulseAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", salaryDate: 1, monthlyIncome: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/pulse" replace />;

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signup(form.email, form.password, form.name, form.salaryDate, form.monthlyIncome);
      navigate("/pulse");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function googleSignup() {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      navigate("/pulse");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Set up your Pulse" subtitle="Track Food Delivery, Quick Commerce, and Subscriptions.">
      <form onSubmit={submit} className="space-y-4">
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="password" minLength={6} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select className="input" value={form.salaryDate} onChange={(e) => setForm({ ...form, salaryDate: e.target.value })}>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => <option key={day} value={day}>{day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} salary credit date</option>)}
        </select>
        <input className="input" type="number" min="0" placeholder="Approx monthly income ₹" value={form.monthlyIncome} onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })} required />
        {error && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
      </form>
      <button onClick={googleSignup} className="btn-secondary mt-3 w-full" disabled={loading}>Continue with Google</button>
      <p className="mt-5 text-center text-sm text-paisa-muted">Already sorted? <Link className="font-bold text-paisa-accentLight" to="/login">Sign in</Link></p>
    </AuthFrame>
  );
}
