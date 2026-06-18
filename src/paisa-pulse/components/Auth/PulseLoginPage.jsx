import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { usePulseTheme } from "../../context/PulseThemeContext";
import { friendlyAuthError } from "../../utils/pulseAuthErrors";

export default function PulseLoginPage() {
  const { user, login, loginWithGoogle } = usePulseAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/pulse" replace />;

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form.email, form.password);
      navigate("/pulse");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
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
    <AuthFrame title="Welcome back" subtitle="No bank access. No upsells. Just your money, decoded.">
      <form onSubmit={submit} className="space-y-4">
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <input className="input" type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <p className="rounded-lg bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      <button onClick={googleLogin} className="btn-secondary mt-3 w-full" disabled={loading}>Continue with Google</button>
      <p className="mt-5 text-center text-sm text-paisa-muted">New here? <Link className="font-bold text-paisa-accentLight" to="/signup">Create account</Link></p>
    </AuthFrame>
  );
}

export function AuthFrame({ title, subtitle, children }) {
  const { theme, toggleTheme } = usePulseTheme();

  return (
    <main className="grid min-h-screen place-items-center bg-paisa-bg px-4 py-6">
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed right-4 top-4 rounded-full border border-paisa-border bg-paisa-card px-3 py-2 text-xs font-bold text-paisa-muted transition hover:bg-paisa-hover hover:text-paisa-text"
      >
        <span className="mr-2">{theme === "dark" ? "☀️" : "🌙"}</span>
        {theme === "dark" ? "Light mode" : "Dark mode"}
      </button>
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-2 w-24 rounded-full bg-paisa-accentLight" />
          <h1 className="font-heading text-4xl font-extrabold"><span className="text-paisa-accentLight">Paysa</span> Pulse 💓</h1>
          <p className="mt-3 text-paisa-muted">{subtitle}</p>
        </div>
        <div className="card">
          <h2 className="mb-5 font-heading text-2xl font-bold">{title}</h2>
          {children}
        </div>
      </section>
    </main>
  );
}
