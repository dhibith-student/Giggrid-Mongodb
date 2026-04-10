import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { EmptyState, PageShell, PrimaryButton, SectionCard, StatCard, StatusPill } from "../components/ui";
import { AdminModal, AdminTable } from "../components/admin/AdminUi";
import { closeProject, fetchAdminWorkspace, updateBidStatus } from "../lib/admin";
import { supabase } from "../lib/supabase";

function useAdminWorkspace() {
  const [state, setState] = useState({
    loading: true,
    workspace: null,
    error: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadWorkspace = async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const workspace = await fetchAdminWorkspace();

        if (active) {
          setState({
            loading: false,
            workspace,
            error: "",
          });
        }
      } catch (error) {
        if (active) {
          setState({
            loading: false,
            workspace: null,
            error: error?.message || "Failed to load admin workspace.",
          });
        }
      }
    };

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  return {
    ...state,
    refresh: () => setRefreshKey((value) => value + 1),
  };
}

function SimpleBarChart({ data }) {
  if (!data.length) {
    return <EmptyState title="No chart data" description="Projects and bids will appear here once platform activity exists." />;
  }

  const values = data.map((item) => item.value);
  const max = Math.max(...values, 1);

  return (
    <div className="grid gap-4">
      {data.map((item) => (
        <div key={item.label} className="grid gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SimplePieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!data.length || total === 0) {
    return <EmptyState title="No bid distribution yet" description="Bid status breakdown will appear once bids are submitted." />;
  }

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce((items, item) => {
    const previous = items[items.length - 1];
    const strokeLength = total ? (item.value / total) * circumference : 0;
    const strokeOffset = previous ? previous.strokeOffset + previous.strokeLength : 0;

    items.push({
      ...item,
      strokeLength,
      strokeOffset,
    });

    return items;
  }, []);

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="relative mx-auto h-44 w-44">
        <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="22" />
          {segments.map((item) => (
            <circle
              key={item.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="22"
              strokeDasharray={`${item.strokeLength} ${circumference - item.strokeLength}`}
              strokeDashoffset={-item.strokeOffset}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{total}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Bids</p>
          </div>
        </div>
      </div>

      <div className="grid flex-1 gap-3">
        {data.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium text-slate-700">{item.label}</span>
            </div>
            <span className="font-semibold text-slate-900">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPlaceholderPage({ title, subtitle }) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      <SectionCard title={title} subtitle="This section is connected to the admin-only route shell and ready for the next implementation task.">
        <EmptyState title="Section in progress" description="The route is live and protected. Data tables and actions will be added in the next task." />
      </SectionCard>
    </PageShell>
  );
}

function AdminLoadingPage({ title, subtitle }) {
  return <PageShell title={title} subtitle={subtitle} />;
}

function AdminErrorPage({ title, subtitle, error }) {
  return (
    <PageShell title={title} subtitle={subtitle}>
      <SectionCard title={`Unable to load ${title.toLowerCase()}`} subtitle={error}>
        <EmptyState title={`${title} unavailable`} description="This admin section could not be loaded right now." />
      </SectionCard>
    </PageShell>
  );
}

function AdminFilterSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-2 sm:max-w-xs">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <select
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AdminDashboardPage() {
  const { loading, workspace, error } = useAdminWorkspace();

  if (loading) {
    return <PageShell title="Dashboard" subtitle="Loading admin overview..." />;
  }

  if (error) {
    return (
      <PageShell title="Dashboard" subtitle="Admin overview">
        <SectionCard title="Unable to load dashboard" subtitle={error}>
          <EmptyState title="Dashboard unavailable" description="The admin metrics could not be loaded right now." />
        </SectionCard>
      </PageShell>
    );
  }

  const metrics = workspace?.metrics;
  const analytics = workspace?.analytics;
  const metricCards = [
    { label: "Total Users", value: metrics?.totalUsers || 0 },
    { label: "Total Freelancers", value: metrics?.totalFreelancers || 0 },
    { label: "Total Clients", value: metrics?.totalClients || 0 },
    { label: "Total Projects", value: metrics?.totalProjects || 0 },
    { label: "Open Projects", value: metrics?.openProjects || 0 },
    { label: "Total Bids", value: metrics?.totalBids || 0 },
    { label: "Pending Bids", value: metrics?.pendingBids || 0 },
    { label: "Approved Bids", value: metrics?.approvedBids || 0 },
    { label: "Rejected Bids", value: metrics?.rejectedBids || 0 },
  ];

  return (
    <PageShell title="Dashboard" subtitle="Platform-wide metrics, bid flow, and project activity for the admin workspace.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((card) => (
          <StatCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Projects vs Bids" subtitle="A quick comparison of total project volume against bid activity.">
          <SimpleBarChart data={analytics?.projectsVsBids || []} />
        </SectionCard>

        <SectionCard title="Bid Status Distribution" subtitle="Pending, approved, and rejected bids across the platform.">
          <SimplePieChart data={analytics?.bidStatusDistribution || []} />
        </SectionCard>
      </div>
    </PageShell>
  );
}

export function AdminProjectsPage() {
  const { loading, workspace, error, refresh } = useAdminWorkspace();
  const [selectedProject, setSelectedProject] = useState(null);
  const [closingProjectId, setClosingProjectId] = useState("");
  const [actionError, setActionError] = useState("");

  const projectRows = workspace?.projectRows || [];

  const handleCloseProject = async (projectId) => {
    setClosingProjectId(projectId);
    setActionError("");

    try {
      await closeProject(projectId);
      if (selectedProject?.id === projectId) {
        setSelectedProject((current) => (current ? { ...current, status: "closed" } : current));
      }
      refresh();
    } catch (closeError) {
      setActionError(closeError?.message || "Failed to close project.");
    } finally {
      setClosingProjectId("");
    }
  };

  if (loading) {
    return <PageShell title="Projects" subtitle="Loading project management..." />;
  }

  if (error) {
    return (
      <PageShell title="Projects" subtitle="Project management">
        <SectionCard title="Unable to load projects" subtitle={error}>
          <EmptyState title="Projects unavailable" description="The admin project table could not be loaded right now." />
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell title="Projects" subtitle="Review project records, inspect details, and close open projects safely from the admin workspace.">
      <SectionCard title="Project Management" subtitle="All projects across the platform with safe actions and defensive empty states.">
        {actionError ? <p className="mb-4 text-sm text-rose-600">{actionError}</p> : null}

        {!projectRows.length ? (
          <EmptyState title="No projects found" description="Projects will appear here once clients start posting work." />
        ) : (
          <AdminTable
            columns={[
              { key: "title", label: "Title" },
              { key: "description", label: "Description" },
              { key: "budget", label: "Budget" },
              { key: "clientName", label: "Client Name" },
              { key: "status", label: "Status" },
              { key: "createdDate", label: "Created Date" },
              { key: "actions", label: "Actions", className: "min-w-52" },
            ]}
          >
            {projectRows.map((project) => (
              <tr key={project.id} className="align-top">
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{project.title}</td>
                <td className="max-w-sm px-4 py-4 text-sm leading-6 text-slate-600">{project.description}</td>
                <td className="px-4 py-4 text-sm text-slate-700">${project.budget.toLocaleString()}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{project.clientName}</td>
                <td className="px-4 py-4">
                  <StatusPill tone={project.status === "open" ? "brand" : "default"}>{project.status}</StatusPill>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">{project.createdDateLabel}</td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedProject(project)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      View Details
                    </button>
                    <PrimaryButton
                      type="button"
                      onClick={() => handleCloseProject(project.id)}
                      disabled={project.status !== "open" || closingProjectId === project.id}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      {closingProjectId === project.id ? "Closing..." : "Close Project"}
                    </PrimaryButton>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </SectionCard>

      <AdminModal
        open={Boolean(selectedProject)}
        title={selectedProject?.title || "Project Details"}
        subtitle="Admin detail view for the selected project."
        onClose={() => setSelectedProject(null)}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedProject?.clientName || "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Budget</p>
              <p className="mt-2 text-sm font-medium text-slate-900">${(selectedProject?.budget || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedProject?.status || "-"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Created</p>
              <p className="mt-2 text-sm font-medium text-slate-900">{selectedProject?.createdDateLabel || "-"}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{selectedProject?.description || "-"}</p>
          </div>
        </div>
      </AdminModal>
    </PageShell>
  );
}

export function AdminBidsPage() {
  const { loading, workspace, error, refresh } = useAdminWorkspace();
  const [updatingBidId, setUpdatingBidId] = useState("");
  const [actionError, setActionError] = useState("");
  const [optimisticStatuses, setOptimisticStatuses] = useState({});

  const bidRows = (workspace?.bidRows || []).map((bid) => ({
    ...bid,
    status: optimisticStatuses[bid.id] || bid.status,
  }));

  const handleBidDecision = async (bidId, status) => {
    setUpdatingBidId(bidId);
    setActionError("");
    setOptimisticStatuses((current) => ({ ...current, [bidId]: status }));

    try {
      await updateBidStatus(bidId, status);
      refresh();
    } catch (updateError) {
      setOptimisticStatuses((current) => {
        const next = { ...current };
        delete next[bidId];
        return next;
      });
      setActionError(updateError?.message || `Failed to ${status} bid.`);
    } finally {
      setUpdatingBidId("");
    }
  };

  if (loading) {
    return <PageShell title="Bids" subtitle="Loading bid management..." />;
  }

  if (error) {
    return (
      <PageShell title="Bids" subtitle="Bid management">
        <SectionCard title="Unable to load bids" subtitle={error}>
          <EmptyState title="Bids unavailable" description="The admin bid table could not be loaded right now." />
        </SectionCard>
      </PageShell>
    );
  }

  return (
    <PageShell title="Bids" subtitle="Approve or reject freelancer bids with immediate status feedback across the admin workspace.">
      <SectionCard title="Bid Management" subtitle="Review each proposal with the linked project, freelancer, amount, and current status.">
        {actionError ? <p className="mb-4 text-sm text-rose-600">{actionError}</p> : null}

        {!bidRows.length ? (
          <EmptyState title="No bids found" description="Submitted bids will appear here once freelancers start bidding on projects." />
        ) : (
          <AdminTable
            columns={[
              { key: "projectTitle", label: "Project Title" },
              { key: "freelancerName", label: "Freelancer Name" },
              { key: "bidAmount", label: "Bid Amount" },
              { key: "proposal", label: "Proposal" },
              { key: "status", label: "Status" },
              { key: "actions", label: "Actions", className: "min-w-52" },
            ]}
          >
            {bidRows.map((bid) => (
              <tr key={bid.id} className="align-top">
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{bid.projectTitle}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{bid.freelancerName}</td>
                <td className="px-4 py-4 text-sm text-slate-700">${bid.bidAmount.toLocaleString()}</td>
                <td className="max-w-sm px-4 py-4 text-sm leading-6 text-slate-600">{bid.proposal}</td>
                <td className="px-4 py-4">
                  <StatusPill tone={bid.status === "approved" ? "success" : bid.status === "rejected" ? "danger" : "warning"}>
                    {bid.status}
                  </StatusPill>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton
                      type="button"
                      onClick={() => handleBidDecision(bid.id, "approved")}
                      disabled={updatingBidId === bid.id || bid.status === "approved"}
                    >
                      {updatingBidId === bid.id && optimisticStatuses[bid.id] === "approved" ? "Approving..." : "Approve Bid"}
                    </PrimaryButton>
                    <button
                      type="button"
                      onClick={() => handleBidDecision(bid.id, "rejected")}
                      disabled={updatingBidId === bid.id || bid.status === "rejected"}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updatingBidId === bid.id && optimisticStatuses[bid.id] === "rejected" ? "Rejecting..." : "Reject Bid"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </AdminTable>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function AdminUsersPage() {
  const { loading, workspace, error } = useAdminWorkspace();
  const [filter, setFilter] = useState("all");

  if (loading) {
    return <AdminLoadingPage title="Users" subtitle="Loading user management..." />;
  }

  if (error) {
    return <AdminErrorPage title="Users" subtitle="User management" error={error} />;
  }

  const allUsers = workspace?.userRows || [];
  const filteredUsers = allUsers.filter((user) => {
    if (filter === "freelancer") return user.role === "freelancer";
    if (filter === "client") return user.role === "client";
    return true;
  });

  return (
    <PageShell title="Users" subtitle="Review platform users and filter the directory by role without leaving the admin workspace.">
      <SectionCard title="User Management" subtitle="All users with role-aware filtering and safe fallback values.">
        <div className="mb-5">
          <AdminFilterSelect
            label="Filter Users"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All Users" },
              { value: "freelancer", label: "Freelancers Only" },
              { value: "client", label: "Clients Only" },
            ]}
          />
        </div>

        {!filteredUsers.length ? (
          <EmptyState title="No users found" description="No users match the selected filter." />
        ) : (
          <AdminTable
            columns={[
              { key: "fullName", label: "Full Name" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Phone" },
              { key: "role", label: "Role" },
              { key: "qualification", label: "Qualification" },
            ]}
          >
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{user.fullName}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{user.email}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{user.phone}</td>
                <td className="px-4 py-4">
                  <StatusPill tone={user.role === "freelancer" ? "brand" : user.role === "client" ? "success" : "default"}>{user.role}</StatusPill>
                </td>
                <td className="px-4 py-4 text-sm text-slate-700">{user.qualification}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function AdminFreelancersPage() {
  const { loading, workspace, error } = useAdminWorkspace();

  if (loading) {
    return <AdminLoadingPage title="Freelancers" subtitle="Loading freelancer directory..." />;
  }

  if (error) {
    return <AdminErrorPage title="Freelancers" subtitle="Freelancer directory" error={error} />;
  }

  const freelancers = workspace?.freelancerRows || [];

  return (
    <PageShell title="Freelancers" subtitle="Directory view for all freelancer accounts with bid activity summaries.">
      <SectionCard title="Freelancer Directory" subtitle="Role-filtered freelancer records built from platform bids and profile data.">
        {!freelancers.length ? (
          <EmptyState title="No freelancers found" description="Freelancer accounts will appear here once they register." />
        ) : (
          <AdminTable
            columns={[
              { key: "name", label: "Name" },
              { key: "bio", label: "Bio" },
              { key: "totalBidsSubmitted", label: "Total Bids Submitted" },
              { key: "activeBids", label: "Active Bids" },
              { key: "approvedBids", label: "Approved Bids" },
            ]}
          >
            {freelancers.map((freelancer) => (
              <tr key={freelancer.id}>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{freelancer.name}</td>
                <td className="max-w-sm px-4 py-4 text-sm leading-6 text-slate-600">{freelancer.bio}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{freelancer.totalBidsSubmitted}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{freelancer.activeBids}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{freelancer.approvedBids}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function AdminClientsPage() {
  const { loading, workspace, error } = useAdminWorkspace();

  if (loading) {
    return <AdminLoadingPage title="Clients" subtitle="Loading client directory..." />;
  }

  if (error) {
    return <AdminErrorPage title="Clients" subtitle="Client directory" error={error} />;
  }

  const clients = workspace?.clientRows || [];

  return (
    <PageShell title="Clients" subtitle="Directory view for client accounts with project posting totals and active project counts.">
      <SectionCard title="Client Directory" subtitle="Role-filtered client records built from user and project activity.">
        {!clients.length ? (
          <EmptyState title="No clients found" description="Client accounts will appear here once users post projects." />
        ) : (
          <AdminTable
            columns={[
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "totalProjectsPosted", label: "Total Projects Posted" },
              { key: "activeProjects", label: "Active Projects" },
            ]}
          >
            {clients.map((client) => (
              <tr key={client.id}>
                <td className="px-4 py-4 text-sm font-semibold text-slate-900">{client.name}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{client.email}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{client.totalProjectsPosted}</td>
                <td className="px-4 py-4 text-sm text-slate-700">{client.activeProjects}</td>
              </tr>
            ))}
          </AdminTable>
        )}
      </SectionCard>
    </PageShell>
  );
}

export function AdminClaimsPage() {
  return (
    <PageShell title="Claims" subtitle="Claims and disputes stay as an admin-only placeholder until backend support is implemented.">
      <SectionCard title="Claims / Disputes" subtitle="Placeholder UI only. No backend claim table has been implemented in the current project.">
        <EmptyState title="Claims backend not available" description="When claim and dispute support is added, this section will render Claim ID, Project, Raised By, Description, and Status." />
      </SectionCard>
    </PageShell>
  );
}

export function AdminAnalyticsPage() {
  const { loading, workspace, error } = useAdminWorkspace();

  if (loading) {
    return <AdminLoadingPage title="Analytics" subtitle="Loading admin analytics..." />;
  }

  if (error) {
    return <AdminErrorPage title="Analytics" subtitle="Admin analytics" error={error} />;
  }

  const analytics = workspace?.analytics;
  const topFreelancer = analytics?.mostActiveFreelancer;
  const topClient = analytics?.mostActiveClient;
  const topProject = analytics?.topProject;

  return (
    <PageShell title="Analytics" subtitle="Platform activity summaries based on bids, projects, and user participation.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Most Active Freelancer"
          value={topFreelancer?.name || "-"}
          hint={topFreelancer ? `${topFreelancer.totalBidsSubmitted} total bids` : "No freelancer activity yet"}
        />
        <StatCard
          label="Most Active Client"
          value={topClient?.name || "-"}
          hint={topClient ? `${topClient.totalProjectsPosted} projects posted` : "No client activity yet"}
        />
        <StatCard
          label="Top Project"
          value={topProject?.projectTitle || "-"}
          hint={topProject ? `${topProject.bidCount} bids received` : "No project bidding activity yet"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Bids per Project" subtitle="Top projects ranked by bid volume using lightweight chart rendering.">
          <SimpleBarChart data={analytics?.bidsPerProject || []} />
        </SectionCard>

        <SectionCard title="Simple Statistics" subtitle="Quick operational summaries without heavy reporting dependencies.">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Freelancer Summary</p>
              <p className="mt-2 text-sm text-slate-700">
                {topFreelancer
                  ? `${topFreelancer.name} leads with ${topFreelancer.totalBidsSubmitted} bids and ${topFreelancer.approvedBids} approvals.`
                  : "No freelancer activity is available yet."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Client Summary</p>
              <p className="mt-2 text-sm text-slate-700">
                {topClient
                  ? `${topClient.name} leads with ${topClient.totalProjectsPosted} posted projects and ${topClient.activeProjects} active projects.`
                  : "No client activity is available yet."}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Project Summary</p>
              <p className="mt-2 text-sm text-slate-700">
                {topProject
                  ? `${topProject.projectTitle} currently has the highest bid volume at ${topProject.bidCount} bids.`
                  : "No project has accumulated bids yet."}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

export function AdminProfilePage() {
  const { profile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    localStorage.removeItem("selectedRole");
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <PageShell title="Profile" subtitle="Admin account details are available here without changing shared authentication flows.">
      <SectionCard title="Admin Details" subtitle="Read-only account information from the authenticated admin profile.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{profile?.full_name || "Admin User"}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
            <p className="mt-2 text-sm font-medium text-slate-900">{profile?.email || "-"}</p>
          </div>
        </div>
        <div className="mt-5">
          <PrimaryButton type="button" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? "Logging out..." : "Logout"}
          </PrimaryButton>
        </div>
      </SectionCard>
    </PageShell>
  );
}
