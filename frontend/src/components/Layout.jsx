import { Link, NavLink, Outlet } from "react-router-dom";
import { Home, FilePlus, Map, ClipboardList, Building2 } from "lucide-react";
import { useAuth } from "../AuthContext";

const navItems = [
  { to: "/",         icon: Home,          label: "Home" },
  { to: "/report",   icon: FilePlus,      label: "Report" },
  { to: "/map",      icon: Map,           label: "Map" },
  { to: "/my",       icon: ClipboardList, label: "My Reports" },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-full pb-28 lg:pb-8">
      {/* Top header */}
      <header className="sticky top-0 z-20 border-b border-outline bg-white">
        <div className="max-w-page mx-auto flex items-center justify-between px-4 lg:px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-accent" />
            <span className="font-bold text-lg text-ink">CivicReport AI</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <>
                <span className="hidden sm:inline text-muted">{user.email}</span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded border border-outline hover:bg-surface-container text-ink"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-page mx-auto px-4 lg:px-6 py-6">
        <Outlet />
      </main>

      {/* Bottom nav on mobile, sticky bottom bar on desktop too */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-white border-t border-outline">
        <div className="max-w-page mx-auto grid grid-cols-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold ${
                  isActive ? "text-accent" : "text-muted hover:text-ink"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? "text-accent" : ""}`} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}