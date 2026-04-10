import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";

export function AppLayout({ role }) {
  const { error, loading, profile, session } = useAuth();

  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading workspace...</div>;
  }

  if (error && session) {
    return <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-rose-600">{error}</div>;
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (role && profile?.role && profile.role !== role) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  if (!profile?.role) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <Outlet />
    </div>
  );
}
