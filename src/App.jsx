import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AppLayout } from "./components/AppLayout";
import { AdminLayout } from "./components/AdminLayout";
import { LandingPage, LoginPage, RegisterPage } from "./pages/AuthPages";
import { ProfilePage } from "./pages/ProfilePage";
import {
  ActiveWorkPage,
  BrowseProjectsPage,
  FreelancerDashboardPage,
  FreelancerHistoryPage,
  MyBidsPage,
} from "./pages/FreelancerPages";
import {
  ClientActiveProjectsPage,
  ClientCompletedProjectsPage,
  ClientDashboardPage,
  ClientHistoryPage,
  ManageProjectsPage,
  PostProjectPage,
} from "./pages/ClientPages";
import {
  AdminAnalyticsPage,
  AdminBidsPage,
  AdminClaimsPage,
  AdminClientsPage,
  AdminDashboardPage,
  AdminFreelancersPage,
  AdminProfilePage,
  AdminProjectsPage,
  AdminUsersPage,
} from "./pages/AdminPages";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<AppLayout />}>
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route element={<AppLayout role="freelancer" />}>
        <Route path="/freelancer/dashboard" element={<FreelancerDashboardPage />} />
        <Route path="/freelancer/projects" element={<BrowseProjectsPage />} />
        <Route path="/freelancer/bids" element={<MyBidsPage />} />
        <Route path="/freelancer/active" element={<ActiveWorkPage />} />
        <Route path="/freelancer/history" element={<FreelancerHistoryPage />} />
      </Route>

      <Route element={<AppLayout role="client" />}>
        <Route path="/client/dashboard" element={<ClientDashboardPage />} />
        <Route path="/client/post-project" element={<PostProjectPage />} />
        <Route path="/client/manage-projects" element={<ManageProjectsPage />} />
        <Route path="/client/active-projects" element={<ClientActiveProjectsPage />} />
        <Route path="/client/completed-projects" element={<ClientCompletedProjectsPage />} />
        <Route path="/client/history" element={<ClientHistoryPage />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/projects" element={<AdminProjectsPage />} />
        <Route path="/admin/bids" element={<AdminBidsPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/freelancers" element={<AdminFreelancersPage />} />
        <Route path="/admin/clients" element={<AdminClientsPage />} />
        <Route path="/admin/claims" element={<AdminClaimsPage />} />
        <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        <Route path="/admin/profile" element={<AdminProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
