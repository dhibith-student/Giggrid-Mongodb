import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { EmptyState, Field, PageShell, PrimaryButton, SectionCard, StatCard, StatusPill, inputClassName } from "../components/ui";

const categories = [
  "Web Development",
  "Mobile App Development",
  "Graphic Design",
  "Writing & Translation",
  "Digital Marketing",
  "Video & Animation",
  "Other",
];

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "budget_high", label: "Highest budget" },
  { value: "budget_low", label: "Lowest budget" },
  { value: "title", label: "Title A-Z" },
  { value: "category", label: "Category A-Z" },
];

const filterOptions = {
  manage: [
    { value: "all", label: "All categories" },
    ...categories.map((category) => ({ value: category, label: category })),
  ],
  active: [
    { value: "all", label: "All active projects" },
    { value: "not_deposited", label: "Awaiting deposit" },
    { value: "deposited", label: "Deposit received" },
  ],
  completed: [
    { value: "all", label: "All completed projects" },
    ...categories.map((category) => ({ value: category, label: category })),
  ],
  history: [
    { value: "all", label: "All transactions" },
    { value: "deposited", label: "Deposited" },
    { value: "released", label: "Released" },
  ],
};

function currency(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function getComparableDate(value) {
  return value ? new Date(value).getTime() : 0;
}

function sortProjects(projects, sortKey) {
  const items = [...projects];

  items.sort((left, right) => {
    switch (sortKey) {
      case "oldest":
        return getComparableDate(left.created_at) - getComparableDate(right.created_at);
      case "budget_high":
        return Number(right.budget || 0) - Number(left.budget || 0);
      case "budget_low":
        return Number(left.budget || 0) - Number(right.budget || 0);
      case "title":
        return (left.title || "").localeCompare(right.title || "");
      case "category":
        return (left.category || "").localeCompare(right.category || "");
      case "newest":
      default:
        return getComparableDate(right.created_at) - getComparableDate(left.created_at);
    }
  });

  return items;
}

function getProjectPhase(project) {
  if (project.payment_status === "released") return "completed";
  if (project.status === "closed") return "active";
  return "open";
}

function filterProjects(projects, filterKey, mode) {
  if (filterKey === "all") return projects;

  switch (mode) {
    case "manage":
    case "completed":
      return projects.filter((project) => project.category === filterKey);
    case "active":
    case "history":
      return projects.filter((project) => project.payment_status === filterKey);
    default:
      return projects;
  }
}

function useClientProjects() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, projects: [], error: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    let active = true;

    const loadProjects = async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("client_id", profile.id)
          .neq("status", "removed")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (active) {
          setState({ loading: false, projects: data || [], error: "" });
        }
      } catch (error) {
        console.error("Failed to load client projects:", error);
        if (active) {
          setState({ loading: false, projects: [], error: error.message || "Failed to load projects." });
        }
      }
    };

    loadProjects();

    return () => {
      active = false;
    };
  }, [profile?.id, refreshKey]);

  return {
    ...state,
    refresh: () => setRefreshKey((value) => value + 1),
  };
}

async function fetchProjectBids(projectId) {
  const { data, error } = await supabase
    .from("bids")
    .select("id, bid_amount, proposal, status, freelancer_id, users(full_name, email)")
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  return data || [];
}

function useProjectBids(projects) {
  const [state, setState] = useState({ loading: true, bidsByProject: {}, error: "" });

  useEffect(() => {
    let active = true;

    if (!projects.length) {
      setState({ loading: false, bidsByProject: {}, error: "" });
      return () => {
        active = false;
      };
    }

    const loadBids = async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const entries = await Promise.all(projects.map(async (project) => [project.id, await fetchProjectBids(project.id)]));
        if (active) {
          setState({ loading: false, bidsByProject: Object.fromEntries(entries), error: "" });
        }
      } catch (error) {
        console.error("Failed to load project bids:", error);
        if (active) {
          setState({ loading: false, bidsByProject: {}, error: error.message || "Failed to load project bids." });
        }
      }
    };

    loadBids();

    return () => {
      active = false;
    };
  }, [projects]);

  return state;
}

function getApprovedBid(projectId, bidsByProject) {
  return (bidsByProject[projectId] || []).find((bid) => bid.status === "approved") || null;
}

function getProjectValue(project, bidsByProject) {
  const approvedBid = getApprovedBid(project.id, bidsByProject);
  return Number(approvedBid?.bid_amount || project.budget || 0);
}

function SortControl({ value, onChange }) {
  return (
    <ControlSelect label="Sort by" value={value} options={sortOptions} onChange={onChange} />
  );
}

function FilterControl({ value, options, onChange }) {
  return <ControlSelect label="Filter" value={value} options={options} onChange={onChange} />;
}

function ControlSelect({ label, value, options, onChange }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <div className="relative min-w-48">
        <select
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
          <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
            <path d="m5 7 5 6 5-6" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function ControlsRow({ sortKey, onSortChange, filterKey, filterOptions: options, onFilterChange }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-end sm:justify-end">
      {options ? <FilterControl value={filterKey} options={options} onChange={onFilterChange} /> : null}
      <SortControl value={sortKey} onChange={onSortChange} />
    </div>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 3a4 4 0 0 0-4 4v1.2c0 .9-.3 1.8-.8 2.5L5.7 13a2 2 0 0 0 1.7 3h9.2a2 2 0 0 0 1.7-3l-1.5-2.3a4.5 4.5 0 0 1-.8-2.5V7a4 4 0 0 0-4-4Z" />
      <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

function ClientNotificationItem({ item }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600">
            <BellIcon />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">{item.detail}</p>
          </div>
        </div>
        <StatusPill tone={item.tone || "brand"}>{item.tag}</StatusPill>
      </div>
    </div>
  );
}

function getClientNotifications(projects, bidsByProject) {
  const notifications = [];

  projects.forEach((project) => {
    const bids = bidsByProject[project.id] || [];
    bids
      .filter((bid) => bid.status === "pending")
      .forEach((bid) => {
        notifications.push({
          id: `pending-${bid.id}`,
          title: "New bid received",
          detail: `${bid.users?.full_name || "A freelancer"} submitted ${currency(bid.bid_amount)} for ${project.title}.`,
          tag: "Bid",
          tone: "brand",
        });
      });
  });

  return notifications.slice(0, 8);
}

function NotificationPanel({ items }) {
  return (
    <SectionCard title="Notifications" subtitle="Bid submissions appear here so the client can react quickly.">
      {!items.length ? (
        <EmptyState title="No notifications yet" description="New bid submissions will show up here." />
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <ClientNotificationItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function PhaseBarChart({ data }) {
  return <BarChart data={data.map((item) => ({ ...item, displayValue: `${item.value} projects` }))} />;
}

function FinanceBarChart({ data }) {
  return <BarChart data={data.map((item) => ({ ...item, displayValue: currency(item.value) }))} />;
}

function ProjectSummaryCard({ project, approvedBid, extra, actions }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{project.title}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">{project.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="brand">{project.category || "Uncategorized"}</StatusPill>
          <StatusPill>{project.status}</StatusPill>
          <StatusPill tone={project.payment_status === "released" ? "success" : project.payment_status === "deposited" ? "brand" : "warning"}>
            {project.payment_status}
          </StatusPill>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 md:grid-cols-3">
        <p>Budget: {currency(project.budget)}</p>
        <p>Created: {project.created_at ? new Date(project.created_at).toLocaleDateString() : "-"}</p>
        <p>Accepted value: {currency(approvedBid?.bid_amount || project.budget)}</p>
      </div>

      {approvedBid ? (
        <div className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{approvedBid.users?.full_name || "Assigned freelancer"}</p>
          <p className="mt-1">{approvedBid.users?.email || "No email available"}</p>
          <p className="mt-3">Accepted bid: {currency(approvedBid.bid_amount)}</p>
          <p className="mt-2 leading-7">{approvedBid.proposal}</p>
        </div>
      ) : null}

      {extra ? <div className="mt-4">{extra}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="relative mx-auto h-44 w-44">
          <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="22" />
            {data.map((item) => {
              const length = total ? (item.value / total) * circumference : 0;
              const circle = (
                <circle
                  key={item.label}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="22"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += length;
              return circle;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-3xl font-semibold tracking-tight text-slate-900">{total}</p>
              <p className="text-xs uppercase tracking-wide text-slate-400">Projects</p>
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
    </div>
  );
}

function BarChart({ data }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-4">
        {data.map((item) => (
          <div key={item.label} className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="font-semibold text-slate-900">{item.displayValue || item.value}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data }) {
  const width = 420;
  const height = 220;
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data
    .map((item, index) => {
      const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * (width - 40) + 20;
      const y = height - 20 - (item.value / max) * (height - 50);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
        <line x1="20" y1={height - 20} x2={width - 10} y2={height - 20} stroke="#E5E7EB" strokeWidth="2" />
        <polyline fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {data.map((item, index) => {
          const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * (width - 40) + 20;
          const y = height - 20 - (item.value / max) * (height - 50);
          return (
            <g key={item.label}>
              <circle cx={x} cy={y} r="5" fill="#06B6D4" />
              <text x={x} y={height - 2} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProjectHistoryTable({ items, bidsByProject, sortKey }) {
  const sortedItems = useMemo(() => sortProjects(items, sortKey), [items, sortKey]);

  if (!sortedItems.length) return <EmptyState title="No records yet" description="This page will populate as projects move through your workflow." />;

  return (
    <div className="grid gap-4">
      {sortedItems.map((project) => {
        const approvedBid = getApprovedBid(project.id, bidsByProject);

        return (
          <ProjectSummaryCard
            key={project.id}
            project={project}
            approvedBid={approvedBid}
            extra={
              <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                <p>Project phase: {getProjectPhase(project)}</p>
                <p>Total paid: {project.payment_status === "released" ? currency(approvedBid?.bid_amount || project.budget) : "Pending release"}</p>
              </div>
            }
          />
        );
      })}
    </div>
  );
}

export function ClientDashboardPage() {
  const { loading, projects, error } = useClientProjects();
  const { bidsByProject, loading: bidsLoading, error: bidsError } = useProjectBids(projects);

  if (loading || bidsLoading) return <PageShell title="Client Dashboard" subtitle="Loading project overview..." />;
  if (error || bidsError) return <PageShell title="Client Dashboard" subtitle={error || bidsError} />;

  const openProjects = projects.filter((project) => project.status === "open");
  const activeProjects = projects.filter((project) => project.status === "closed" && project.payment_status !== "released");
  const completedProjects = projects.filter((project) => project.payment_status === "released");
  const totalPaid = completedProjects.reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0);
  const activeCommitment = activeProjects.reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0);
  const totalBudget = projects.reduce((sum, project) => sum + Number(project.budget || 0), 0);
  const pendingBids = Object.values(bidsByProject).flat().filter((bid) => bid.status === "pending").length;

  const phaseChartData = [
    { label: "Open", value: openProjects.length, color: "#4F46E5" },
    { label: "Active", value: activeProjects.length, color: "#06B6D4" },
    { label: "Completed", value: completedProjects.length, color: "#10B981" },
  ];
  const bidStatusData = [
    { label: "Pending bids", value: Object.values(bidsByProject).flat().filter((bid) => bid.status === "pending").length },
    { label: "Accepted bids", value: Object.values(bidsByProject).flat().filter((bid) => bid.status === "approved").length },
    { label: "Rejected bids", value: Object.values(bidsByProject).flat().filter((bid) => bid.status === "rejected").length },
  ];
  const financeData = [
    { label: "Project budget", value: totalBudget },
    { label: "Active commitment", value: activeCommitment },
    { label: "Released payments", value: totalPaid },
  ];

  const categoryData = categories
    .map((category) => ({
      label: category,
      value: projects.filter((project) => project.category === category).reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0),
    }))
    .filter((item) => item.value > 0)
    .slice(0, 5)
    .map((item) => ({ ...item, displayValue: currency(item.value) }));

  const notifications = getClientNotifications(projects, bidsByProject);

  return (
    <PageShell title="Client Dashboard" subtitle="A stronger operational overview with live project analysis, payment insight, and workload distribution.">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projects Posted" value={projects.length} hint={`Total budget ${currency(totalBudget)}`} />
        <StatCard label="Open Projects" value={openProjects.length} hint={`${pendingBids} pending bids`} />
        <StatCard label="Active Projects" value={activeProjects.length} hint={`Committed ${currency(activeCommitment)}`} />
        <StatCard label="Completed Projects" value={completedProjects.length} hint={`Paid ${currency(totalPaid)}`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Project Phase Split" subtitle="See how your posted work is distributed across open, active, and completed phases.">
          <PieChart data={phaseChartData} />
        </SectionCard>

        <SectionCard title="Spend by Category" subtitle="Budget and accepted value grouped by the type of work you commission most often.">
          {categoryData.length ? <BarChart data={categoryData} /> : <EmptyState title="No category data yet" description="Post or accept more work to generate spend analysis." />}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Project Status Analysis" subtitle="A cleaner comparison of your bid funnel and accepted delivery stages.">
          <PhaseBarChart data={bidStatusData} />
        </SectionCard>

        <SectionCard title="Financial Analysis" subtitle="Compare total posted budget, active commitments, and released payments at a glance.">
          <FinanceBarChart data={financeData} />
        </SectionCard>
      </div>

      <NotificationPanel items={notifications} />
    </PageShell>
  );
}

export function PostProjectPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", budget: "", category: "" });
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.from("projects").insert([{ ...form, client_id: profile.id, status: "open", payment_status: "not_deposited" }]);
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage("Project posted successfully.");
      setForm({ title: "", description: "", budget: "", category: "" });
    } catch (error) {
      console.error("Failed to post project:", error);
      setMessage(error?.message || "Unable to post project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Post Project" subtitle="Project creation now has its own dedicated page instead of competing with management views.">
      <SectionCard title="Create a new project" subtitle="Structured form layout with balanced spacing and cleaner hierarchy.">
        <form className="grid gap-6 lg:grid-cols-2" onSubmit={submit}>
          <Field label="Title"><input className={inputClassName} value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} /></Field>
          <Field label="Category">
            <select className={inputClassName} value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}>
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </Field>
          <div className="lg:col-span-2">
            <Field label="Description"><textarea className={`${inputClassName} min-h-32`} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} /></Field>
          </div>
          <Field label="Budget"><input className={inputClassName} type="number" value={form.budget} onChange={(e) => setForm((s) => ({ ...s, budget: e.target.value }))} /></Field>
          <div className="flex items-end">
            <PrimaryButton type="submit" disabled={loading} className="w-full">{loading ? "Posting..." : "Post Project"}</PrimaryButton>
          </div>
        </form>
        {message ? <p className="mt-4 text-sm text-brand-600">{message}</p> : null}
      </SectionCard>
    </PageShell>
  );
}

export function ManageProjectsPage() {
  const { loading, projects, error, refresh } = useClientProjects();
  const { bidsByProject, loading: bidsLoading, error: bidsError } = useProjectBids(projects);
  const [sortKey, setSortKey] = useState("newest");
  const [filterKey, setFilterKey] = useState("all");
  const openProjects = useMemo(
    () => sortProjects(filterProjects(projects.filter((project) => project.status === "open"), filterKey, "manage"), sortKey),
    [filterKey, projects, sortKey],
  );

  const acceptBid = async (projectId, bid) => {
    try {
      const approveResult = await supabase.from("bids").update({ status: "approved" }).eq("id", bid.id);
      if (approveResult.error) throw approveResult.error;

      const rejectResult = await supabase.from("bids").update({ status: "rejected" }).eq("project_id", projectId).neq("id", bid.id);
      if (rejectResult.error) throw rejectResult.error;

      const projectResult = await supabase.from("projects").update({ status: "closed" }).eq("id", projectId);
      if (projectResult.error) throw projectResult.error;

      refresh();
    } catch (error) {
      console.error("Failed to accept bid:", error);
    }
  };

  const rejectBid = async (bidId) => {
    try {
      const result = await supabase.from("bids").update({ status: "rejected" }).eq("id", bidId);
      if (result.error) throw result.error;
      refresh();
    } catch (error) {
      console.error("Failed to reject bid:", error);
    }
  };

  const removeProject = async (projectId) => {
    try {
      const rejectResult = await supabase.from("bids").update({ status: "rejected" }).eq("project_id", projectId);
      if (rejectResult.error) throw rejectResult.error;

      const projectResult = await supabase.from("projects").update({ status: "removed" }).eq("id", projectId);
      if (projectResult.error) throw projectResult.error;

      refresh();
    } catch (error) {
      console.error("Failed to remove project:", error);
    }
  };

  if (loading || bidsLoading) return <PageShell title="Manage Projects" subtitle="Loading your open projects..." />;
  if (error || bidsError) return <PageShell title="Manage Projects" subtitle={error || bidsError} />;

  return (
    <PageShell title="Manage Projects" subtitle="Review only open projects here, sort them quickly, and move accepted work into the active pipeline automatically.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Open Projects" value={openProjects.length} hint="Still accepting bids" />
        <StatCard label="Pending Bids" value={Object.values(bidsByProject).flat().filter((bid) => bid.status === "pending").length} hint="Awaiting your decision" />
        <StatCard label="Accepted Moves" value={projects.filter((project) => project.status === "closed" && project.payment_status !== "released").length} hint="Routed to Active Projects" />
      </div>

      <div className="grid gap-5">
        <ControlsRow
          sortKey={sortKey}
          onSortChange={setSortKey}
          filterKey={filterKey}
          filterOptions={filterOptions.manage}
          onFilterChange={setFilterKey}
        />

        {!openProjects.length ? (
          <EmptyState title="No open projects" description="Projects with accepted bids now move into Active Projects automatically." />
        ) : (
          openProjects.map((project) => (
            <SectionCard
              key={project.id}
              title={project.title}
              subtitle={project.description}
              actions={
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone="brand">{project.category || "Uncategorized"}</StatusPill>
                  <StatusPill>{currency(project.budget)}</StatusPill>
                  <StatusPill>{project.status}</StatusPill>
                </div>
              }
            >
              {!bidsByProject[project.id]?.length ? (
                <EmptyState title="No bids yet" description="Once freelancers respond, you will review them here." />
              ) : (
                <div className="grid gap-4">
                  {bidsByProject[project.id].map((bid) => (
                    <div key={bid.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">{bid.users?.full_name || "Freelancer"}</h3>
                          <p className="text-sm text-slate-500">{bid.users?.email || "No email available"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusPill>{bid.status}</StatusPill>
                          <StatusPill tone="brand">{currency(bid.bid_amount)}</StatusPill>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-slate-500">{bid.proposal}</p>
                      {bid.status === "pending" ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <PrimaryButton onClick={() => acceptBid(project.id, bid)}>Accept</PrimaryButton>
                          <button onClick={() => rejectBid(bid.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">Reject</button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => removeProject(project.id)}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                >
                  Remove Project
                </button>
              </div>
            </SectionCard>
          ))
        )}
      </div>
    </PageShell>
  );
}

export function ClientActiveProjectsPage() {
  const { loading, projects, error, refresh } = useClientProjects();
  const { bidsByProject, loading: bidsLoading, error: bidsError } = useProjectBids(projects);
  const [sortKey, setSortKey] = useState("newest");
  const [filterKey, setFilterKey] = useState("all");

  const activeProjects = useMemo(
    () => sortProjects(filterProjects(projects.filter((project) => project.status === "closed" && project.payment_status !== "released"), filterKey, "active"), sortKey),
    [filterKey, projects, sortKey],
  );

  const updatePayment = async (projectId, payment_status) => {
    try {
      const result = await supabase.from("projects").update({ payment_status }).eq("id", projectId);
      if (result.error) throw result.error;
      refresh();
    } catch (error) {
      console.error("Failed to update payment:", error);
    }
  };

  if (loading || bidsLoading) return <PageShell title="Active Projects" subtitle="Loading accepted projects..." />;
  if (error || bidsError) return <PageShell title="Active Projects" subtitle={error || bidsError} />;

  return (
    <PageShell title="Active Projects" subtitle="Accepted projects live here until payment is released, keeping active delivery separate from open bid review.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Accepted Projects" value={activeProjects.length} hint="Currently in delivery or payment flow" />
        <StatCard label="Awaiting Deposit" value={activeProjects.filter((project) => project.payment_status === "not_deposited").length} hint="Deposit when work begins" />
        <StatCard label="Ready To Release" value={activeProjects.filter((project) => project.payment_status === "deposited").length} hint="Release when work is completed" />
      </div>

      <div className="grid gap-5">
        <ControlsRow
          sortKey={sortKey}
          onSortChange={setSortKey}
          filterKey={filterKey}
          filterOptions={filterOptions.active}
          onFilterChange={setFilterKey}
        />

        {!activeProjects.length ? (
          <EmptyState title="No active projects" description="Accepted projects will appear here automatically after you approve a bid." />
        ) : (
          activeProjects.map((project) => {
            const approvedBid = getApprovedBid(project.id, bidsByProject);

            return (
              <ProjectSummaryCard
                key={project.id}
                project={project}
                approvedBid={approvedBid}
                extra={
                  <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                    <p>Delivery stage: {project.payment_status === "deposited" ? "Work in progress / ready for release" : "Waiting for deposit"}</p>
                    <p>Current commitment: {currency(approvedBid?.bid_amount || project.budget)}</p>
                  </div>
                }
                actions={
                  <>
                    {project.payment_status === "not_deposited" ? (
                      <PrimaryButton onClick={() => updatePayment(project.id, "deposited")}>Deposit Payment</PrimaryButton>
                    ) : null}
                    {project.payment_status === "deposited" ? (
                      <PrimaryButton onClick={() => updatePayment(project.id, "released")}>Release Payment</PrimaryButton>
                    ) : null}
                  </>
                }
              />
            );
          })
        )}
      </div>
    </PageShell>
  );
}

export function ClientCompletedProjectsPage() {
  const { loading, projects, error } = useClientProjects();
  const { bidsByProject, loading: bidsLoading, error: bidsError } = useProjectBids(projects);
  const [sortKey, setSortKey] = useState("newest");
  const [filterKey, setFilterKey] = useState("all");
  const completedProjects = useMemo(
    () => sortProjects(filterProjects(projects.filter((project) => project.payment_status === "released"), filterKey, "completed"), sortKey),
    [filterKey, projects, sortKey],
  );

  if (loading || bidsLoading) return <PageShell title="Completed Projects" subtitle="Loading completed projects..." />;
  if (error || bidsError) return <PageShell title="Completed Projects" subtitle={error || bidsError} />;

  return (
    <PageShell title="Completed Projects" subtitle="Released projects move into a dedicated archive with sorting, assigned freelancer detail, and payment summaries.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Completed Projects" value={completedProjects.length} hint="Fully closed with released payment" />
        <StatCard label="Total Released" value={currency(completedProjects.reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0))} hint="Accepted value paid out" />
        <StatCard label="Top Category" value={completedProjects[0]?.category || "-"} hint="Sorted view updates independently" />
      </div>

      <div className="grid gap-5">
        <ControlsRow
          sortKey={sortKey}
          onSortChange={setSortKey}
          filterKey={filterKey}
          filterOptions={filterOptions.completed}
          onFilterChange={setFilterKey}
        />

        {!completedProjects.length ? (
          <EmptyState title="No completed projects" description="Completed projects will land here after payment is released." />
        ) : (
          completedProjects.map((project) => {
            const approvedBid = getApprovedBid(project.id, bidsByProject);

            return (
              <ProjectSummaryCard
                key={project.id}
                project={project}
                approvedBid={approvedBid}
                extra={
                  <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                    <p>Released on: {project.updated_at ? new Date(project.updated_at).toLocaleDateString() : "-"}</p>
                    <p>Total paid: {currency(approvedBid?.bid_amount || project.budget)}</p>
                  </div>
                }
              />
            );
          })
        )}
      </div>
    </PageShell>
  );
}

export function ClientHistoryPage() {
  const { loading, projects, error } = useClientProjects();
  const { bidsByProject, loading: bidsLoading, error: bidsError } = useProjectBids(projects);
  const [sortKey, setSortKey] = useState("newest");
  const [filterKey, setFilterKey] = useState("all");

  if (loading || bidsLoading) return <PageShell title="Transactions & History" subtitle="Loading transaction history..." />;
  if (error || bidsError) return <PageShell title="Transactions & History" subtitle={error || bidsError} />;

  const paidProjects = filterProjects(projects.filter((project) => project.payment_status !== "not_deposited"), filterKey, "history");
  const completedProjects = filterProjects(projects.filter((project) => project.payment_status === "released"), filterKey === "deposited" ? "all" : filterKey, "history");
  const totalReleased = completedProjects.reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0);
  const totalCommitted = paidProjects.reduce((sum, project) => sum + getProjectValue(project, bidsByProject), 0);

  return (
    <PageShell title="Transactions & History" subtitle="Separate payment and completion history keeps the main dashboard focused and easy to scan.">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard label="Payments Started" value={paidProjects.length} hint="Deposited or released projects" />
        <StatCard label="Committed Value" value={currency(totalCommitted)} hint="Accepted project value in the payment pipeline" />
        <StatCard label="Released Value" value={currency(totalReleased)} hint="Already paid out to completed work" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SectionCard title="Payments Made" subtitle="Projects with escrow activity or released funds.">
          <div className="mb-5">
            <ControlsRow
              sortKey={sortKey}
              onSortChange={setSortKey}
              filterKey={filterKey}
              filterOptions={filterOptions.history}
              onFilterChange={setFilterKey}
            />
          </div>
          <ProjectHistoryTable items={paidProjects} bidsByProject={bidsByProject} sortKey={sortKey} />
        </SectionCard>
        <SectionCard title="Completed Projects" subtitle="Projects that have moved fully through the client workflow.">
          <ProjectHistoryTable items={completedProjects} bidsByProject={bidsByProject} sortKey={sortKey} />
        </SectionCard>
      </div>
    </PageShell>
  );
}
