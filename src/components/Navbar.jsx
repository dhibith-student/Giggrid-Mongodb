import { useEffect, useMemo, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

const navByRole = {
  freelancer: [
    { label: "Dashboard", to: "/freelancer/dashboard" },
    { label: "Browse Projects", to: "/freelancer/projects" },
    { label: "My Bids", to: "/freelancer/bids" },
    { label: "Active Work", to: "/freelancer/active" },
    { label: "History", to: "/freelancer/history" },
  ],
  client: [
    { label: "Dashboard", to: "/client/dashboard" },
    { label: "Post Project", to: "/client/post-project" },
    { label: "Manage Projects", to: "/client/manage-projects" },
    { label: "Active Projects", to: "/client/active-projects" },
    { label: "Completed Projects", to: "/client/completed-projects" },
    { label: "Transactions", to: "/client/history" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard" },
    { label: "Projects", to: "/admin/projects" },
    { label: "History", to: "/admin/history" },
  ],
};

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 3a4 4 0 0 0-4 4v1.2c0 .9-.3 1.8-.8 2.5L5.7 13a2 2 0 0 0 1.7 3h9.2a2 2 0 0 0 1.7-3l-1.5-2.3a4.5 4.5 0 0 1-.8-2.5V7a4 4 0 0 0-4-4Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function Navbar() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const isClient = profile?.role === "client";

  const links = useMemo(() => navByRole[profile?.role] || [], [profile?.role]);

  useEffect(() => {
    let active = true;

    const loadNotifications = async () => {
      if (!profile?.id || profile.role !== "client") {
        if (active) {
          setNotifications([]);
        }
        return;
      }

      try {
        const { data: projects, error: projectError } = await supabase
          .from("projects")
          .select("id, title, status, payment_status")
          .eq("client_id", profile.id)
          .neq("status", "removed")
          .order("created_at", { ascending: false });

        if (projectError) throw projectError;

        const projectIds = (projects || []).map((project) => project.id);
        if (!projectIds.length) {
          if (active) {
            setNotifications([]);
          }
          return;
        }

        const { data: bids, error: bidsError } = await supabase
          .from("bids")
          .select("id, bid_amount, status, project_id, users(full_name)")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false });

        if (bidsError) throw bidsError;

        const projectMap = new Map((projects || []).map((project) => [project.id, project]));
        const nextNotifications = [];

        (bids || [])
          .filter((bid) => bid.status === "pending")
          .slice(0, 6)
          .forEach((bid) => {
            const project = projectMap.get(bid.project_id);
            if (!project) return;

            nextNotifications.push({
              id: `bid-${bid.id}`,
              title: "New bid received",
              detail: `${bid.users?.full_name || "A freelancer"} offered $${Number(bid.bid_amount || 0).toLocaleString()} for ${project.title}.`,
            });
          });

        if (active) {
          setNotifications(nextNotifications.slice(0, 8));
        }
      } catch (error) {
        console.error("Failed to load notifications:", error);
        if (active) {
          setNotifications([]);
        }
      }
    };

    loadNotifications();

    return () => {
      active = false;
    };
  }, [profile?.id, profile?.role]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!notificationsOpen) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      const insidePanel = target.closest("[data-notification-panel='true']");
      const insideButton = target.closest("[data-notification-trigger='true']");
      if (!insidePanel && !insideButton) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [notificationsOpen]);

  const handleLogout = async () => {
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 text-sm font-semibold text-white shadow-lg shadow-brand-500/20">
              G
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-slate-900">GigGrid</p>
              <p className="text-xs text-slate-500">Marketplace workspace</p>
            </div>
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 lg:hidden"
        >
          Menu
        </button>

        <nav className="hidden items-center gap-1.5 lg:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="relative hidden items-center gap-3 lg:flex">
          {isClient ? (
            <button
              type="button"
              data-notification-trigger="true"
              onClick={() => setNotificationsOpen((value) => !value)}
              className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <BellIcon />
              {notifications.length ? (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                  {notifications.length}
                </span>
              ) : null}
            </button>
          ) : null}
          <Link
            to="/profile"
            className="grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-sm font-semibold text-white transition hover:scale-105"
          >
            {(profile?.full_name || "G").slice(0, 1).toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Logout
          </button>

          {isClient && notificationsOpen ? (
            <div data-notification-panel="true" className="absolute right-14 top-12 z-20 w-[24rem] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-slate-900">Notifications</p>
                  <p className="text-sm text-slate-500">Latest bid activity</p>
                </div>
                {notifications.length ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{notifications.length} new</span> : null}
              </div>

              {!notifications.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
                  No notifications yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {notifications.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {open && links.length > 0 ? (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              Profile
            </NavLink>
            {isClient ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900">Notifications</p>
                  {notifications.length ? <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{notifications.length}</span> : null}
                </div>
                {!notifications.length ? (
                  <p className="text-sm text-slate-500">No notifications yet.</p>
                ) : (
                  <div className="grid gap-3">
                    {notifications.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-medium ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{profile?.full_name || "GigGrid User"}</p>
              <p className="mt-1">{profile?.email || "No email available"}</p>
              <p className="mt-3"><span className="font-medium text-slate-900">Role:</span> {profile?.role || "-"}</p>
              <p><span className="font-medium text-slate-900">Phone:</span> {profile?.phone || "-"}</p>
              <p><span className="font-medium text-slate-900">Qualification:</span> {profile?.qualification || "-"}</p>
              <p><span className="font-medium text-slate-900">Preferences:</span> {profile?.preferences || "-"}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
            >
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
