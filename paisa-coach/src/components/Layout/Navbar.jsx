import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";
import { useTheme } from "../../context/ThemeContext";

function latestUnreadCount(nudges) {
  if (!nudges.some((nudge) => nudge.batchId)) {
    return [...nudges]
      .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0))
      .slice(0, 4)
      .filter((nudge) => !nudge.isRead).length;
  }
  const latestBatch = nudges.reduce((latest, nudge) => {
    const batch = nudge.batchId || nudge.generatedAt || 0;
    return batch > latest ? batch : latest;
  }, 0);
  return nudges.filter((nudge) => (nudge.batchId || nudge.generatedAt || 0) === latestBatch && !nudge.isRead).length;
}

export default function Navbar() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { items: nudges } = useTransactions("nudges");
  const unread = latestUnreadCount(nudges);

  return (
    <header className="sticky top-0 z-20 border-b border-paisa-border bg-paisa-bg/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <Link to="/dashboard" className="font-heading text-xl font-extrabold text-white">
          <span className="text-paisa-accentLight">paisa</span> coach 💸
        </Link>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="rounded-full bg-paisa-card px-3 py-2 text-sm" title="Toggle theme">
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <Link to="/nudges" className="relative rounded-full bg-paisa-card px-3 py-2 text-sm" title="Nudges">
            🔔
            {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-400 px-1.5 text-[10px] font-bold text-black">{unread}</span>}
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-paisa-accent font-bold text-white">
              {(profile?.name || user?.email || "P").slice(0, 1).toUpperCase()}
            </div>
            <span className="hidden text-sm font-bold sm:block">{profile?.name || user?.displayName || "Paisa user"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
