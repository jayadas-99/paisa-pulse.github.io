import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useTransactions } from "../../hooks/useTransactions";

const links = [
  ["🏠", "Dashboard", "/dashboard"],
  ["📤", "Upload Transactions", "/upload"],
  ["🧾", "Review Transactions", "/transactions"],
  ["💬", "Chat with Paysa Coach", "/chat"],
  ["🔔", "Nudges", "/nudges"],
  ["🎯", "Goals", "/goals"],
  ["⚙️", "Settings", "/settings"],
];

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

export default function Sidebar() {
  const { logout } = useAuth();
  const { items: nudges } = useTransactions("nudges");
  const unread = latestUnreadCount(nudges);

  return (
    <aside className="hidden w-72 shrink-0 border-r border-paisa-border bg-[#0d0d14] p-4 lg:block">
      <nav className="sticky top-20 space-y-2">
        {links.map(([icon, label, path]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold transition ${isActive ? "bg-paisa-accent text-white" : "text-paisa-muted hover:bg-paisa-hover hover:text-white"}`}
          >
            <span><span className="mr-3">{icon}</span>{label}</span>
            {path === "/nudges" && unread > 0 && <span className="rounded-full bg-red-400 px-2 text-xs text-black">{unread}</span>}
          </NavLink>
        ))}
        <button onClick={logout} className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-bold text-paisa-muted hover:bg-paisa-hover hover:text-white">
          <span className="mr-3">🚪</span> Sign Out
        </button>
      </nav>
    </aside>
  );
}
