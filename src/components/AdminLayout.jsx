import { useMemo, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

const adminNavItems = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Projects", to: "/admin/projects" },
  { label: "Bids", to: "/admin/bids" },
  { label: "Users", to: "/admin/users" },
  { label: "Freelancers", to: "/admin/freelancers" },
  { label: "Clients", to: "/admin/clients" },
  { label: "Claims", to: "/admin/claims" },
  { label: "Analytics", to: "/admin/analytics" },
  { label: "Profile", to: "/admin/profile" },
];

function getPageTitle(pathname) {
  const match = adminNavItems.find((item) => pathname.startsWith(item.to));
  return match?.label || "Admin";
}

export function AdminLayout() {
  const { loading, profile, session } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-500">Loading admin workspace...</div>;
  }

  if (!session || !profile || profile.role !== "admin") {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-slate-950 text-slate-100 transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="border-b border-white/10 px-6 py-6">
            <Link to="/admin/dashboard" className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-400/15 text-lg font-semibold text-cyan-300">
                G
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-white">GigGrid Admin</p>
                <p className="text-sm text-slate-400">Control workspace</p>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive ? "bg-cyan-400/15 text-cyan-200" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/10 p-4">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Logout
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Admin Panel</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{pageTitle}</h1>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-900">{profile.full_name || "Admin User"}</p>
                  <p className="text-xs text-slate-500">{profile.email || "-"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen((value) => !value)}
                  className="inline-flex rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 lg:hidden"
                >
                  Menu
                </button>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      ) : null}
    </div>
  );
}
