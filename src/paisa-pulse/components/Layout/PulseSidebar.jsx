import { NavLink } from "react-router-dom";
import { usePulseAuth } from "../../hooks/usePulseAuth";
import { usePulseTheme } from "../../context/PulseThemeContext";

const links = [
  ["💓", "Pulse", "/pulse"],
  ["📋", "Subscriptions", "/pulse/subscriptions"],
  ["💬", "Chat", "/pulse/chat"],
  ["🧮", "What if?", "/pulse/simulator"],
  ["🗺️", "What's next", "/pulse/roadmap"],
  ["⚙️", "Settings", "/pulse/settings"],
];

function navClass({ isActive }) {
  return `flex items-center justify-between rounded-xl px-3 py-3 text-sm font-bold transition ${
    isActive
      ? "bg-paisa-accent text-paisa-bg"
      : "text-paisa-muted hover:bg-paisa-hover hover:text-paisa-text"
  }`;
}

export default function PulseSidebar() {
  const { logout, profile, user } = usePulseAuth();
  const { theme, toggleTheme } = usePulseTheme();

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-paisa-border bg-paisa-card p-4 lg:block">
        <nav className="sticky top-6 flex h-[calc(100vh-3rem)] flex-col">
          <div className="mb-5 px-3">
            <p className="font-heading text-2xl font-extrabold text-paisa-text">Paisa Pulse</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-paisa-muted">Habit tracker</p>
          </div>
          <div className="space-y-2">
            {links.map(([icon, label, path]) => (
              <NavLink key={path} to={path} end={path === "/pulse"} className={navClass}>
                <span><span className="mr-3">{icon}</span>{label}</span>
              </NavLink>
            ))}
          </div>
          <div className="mt-auto border-t border-paisa-border pt-4">
            <div className="mb-3 px-3">
              <p className="truncate text-sm font-bold text-paisa-text">{profile?.name || user?.displayName || "Paisa Pulse user"}</p>
              <p className="truncate text-xs text-paisa-muted">{profile?.email || user?.email}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="mb-1 flex w-full items-center justify-between rounded-xl px-3 py-3 text-sm font-bold text-paisa-muted transition hover:bg-paisa-hover hover:text-paisa-text"
            >
              <span>
                <span className="mr-3">{theme === "dark" ? "☀️" : "🌙"}</span>
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
              <span className="text-xs font-normal opacity-50">toggle</span>
            </button>
            <button type="button" onClick={logout} className="w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-paisa-muted transition hover:bg-paisa-hover hover:text-paisa-text">
              <span className="mr-3">↩</span>Logout
            </button>
          </div>
        </nav>
      </aside>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-paisa-border bg-paisa-card/95 p-2 backdrop-blur lg:hidden">
        {links.map(([icon, label, path]) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/pulse"}
            className={({ isActive }) =>
              `rounded-xl px-2 py-2 text-center text-xs font-bold transition ${
                isActive ? "bg-paisa-accent text-paisa-bg" : "text-paisa-muted"
              }`
            }
          >
            <span className="block text-lg">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
        <div className="col-span-2 flex gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-bold text-paisa-muted transition hover:bg-paisa-hover"
          >
            <span className="block text-lg">{theme === "dark" ? "☀️" : "🌙"}</span>
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex-1 rounded-xl px-2 py-2 text-center text-xs font-bold text-paisa-muted transition hover:bg-paisa-hover"
          >
            <span className="block text-lg">↩</span>
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}
