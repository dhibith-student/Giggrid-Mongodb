import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchFreelancerWorkspace } from "../lib/marketplace";
import { supabase } from "../lib/supabase";
import { EmptyState, Field, PageShell, PrimaryButton, SectionCard, StatCard, StatusPill, inputClassName } from "../components/ui";

function useFreelancerData() {
  const { profile } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const preferences = (profile.preferences || "").toLowerCase().split(",").map((item) => item.trim()).filter(Boolean);
    let active = true;

    const loadWorkspace = async () => {
      setState((current) => ({ ...current, loading: true, error: "" }));

      try {
        const data = await fetchFreelancerWorkspace(profile.id, preferences);
        if (active) {
          setState({ loading: false, data, error: "" });
        }
      } catch (error) {
        console.error("Failed to load freelancer workspace:", error);
        if (active) {
          setState({ loading: false, data: { preferred: [], others: [], pipeline: [], active: [], history: [], bids: [] }, error: error.message || "Failed to load workspace." });
        }
      }
    };

    loadWorkspace();

    return () => {
      active = false;
    };
  }, [profile?.id, profile?.preferences, refreshKey]);

  return {
    ...state,
    refresh: () => setRefreshKey((value) => value + 1),
  };
}

function ProjectGrid({ projects, children }) {
  if (!projects.length) return <EmptyState title="Nothing here yet" description="This section will fill in as your project activity grows." />;

  return <div className="grid gap-5 lg:grid-cols-2">{projects.map(children)}</div>;
}

function ProjectCard({ project, badge, children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{project.title}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill tone="brand">{project.category || "Uncategorized"}</StatusPill>
            <StatusPill>Budget: ${project.budget}</StatusPill>
          </div>
        </div>
        {badge}
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-500">{project.description}</p>
      {children}
    </article>
  );
}

export function FreelancerDashboardPage() {
  const { loading, data, error } = useFreelancerData();
  if (loading) return <PageShell title="Freelancer Dashboard" subtitle="Loading your overview..." />;
  if (error) return <PageShell title="Freelancer Dashboard" subtitle={error} />;

  const earnings = data.history.reduce((sum, project) => sum + Number(project.bid.bid_amount || 0), 0);

  return (
    <PageShell
      title="Freelancer Dashboard"
      subtitle="A clean overview of preferred opportunities, active assignments, and bid pipeline health."
      actions={<Link to="/freelancer/projects" className="rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Browse Projects</Link>}
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Suggested Projects" value={data.preferred.length} hint="Preference-matched opportunities" />
        <StatCard label="Pending Bids" value={data.pipeline.filter((item) => item.bid.status === "pending").length} hint="Awaiting client decisions" />
        <StatCard label="Active Work" value={data.active.length} hint="Approved or in delivery" />
        <StatCard label="Total Earnings" value={`$${earnings}`} hint="Released project value" />
      </div>

      <SectionCard title="Suggested Projects" subtitle="Preferred projects surface here first so discovery feels focused, not noisy.">
        <ProjectGrid projects={data.preferred.slice(0, 4)}>
          {(project) => (
            <ProjectCard key={project.id} project={project} badge={<StatusPill tone="brand">Preferred</StatusPill>}>
              <div className="mt-5">
                <Link to="/freelancer/projects" className="text-sm font-semibold text-brand-600">View in Browse Projects</Link>
              </div>
            </ProjectCard>
          )}
        </ProjectGrid>
      </SectionCard>
    </PageShell>
  );
}

export function BrowseProjectsPage() {
  const { profile } = useAuth();
  const { loading, data, error, refresh } = useFreelancerData();
  const [submittingId, setSubmittingId] = useState(null);
  const [forms, setForms] = useState({});
  const [message, setMessage] = useState("");

  if (loading) return <PageShell title="Browse Projects" subtitle="Loading open work..." />;
  if (error) return <PageShell title="Browse Projects" subtitle={error} />;

  const submitBid = async (projectId) => {
    const form = forms[projectId] || {};
    if (!form.bid_amount || !form.proposal) {
      setMessage("Please enter both a bid amount and a proposal.");
      return;
    }

    setSubmittingId(projectId);
    setMessage("");

    try {
      const { error } = await supabase.from("bids").insert([
        {
          project_id: projectId,
          freelancer_id: profile.id,
          bid_amount: form.bid_amount,
          proposal: form.proposal,
          status: "pending",
        },
      ]);

      if (error) {
        setMessage(error.code === "23505" ? "You have already submitted a bid for this project." : error.message);
        return;
      }

      setForms((state) => {
        const nextState = { ...state };
        delete nextState[projectId];
        return nextState;
      });
      setMessage("Bid submitted successfully.");
      refresh();
    } catch (error) {
      console.error("Failed to submit bid:", error);
      setMessage(error?.message || "Unable to submit bid.");
    } finally {
      setSubmittingId(null);
    }
  };

  const projects = [...data.preferred, ...data.others];

  return (
    <PageShell title="Browse Projects" subtitle="All open projects are separated from your existing bids so the feed stays focused on new opportunities.">
      <SectionCard title="Open Projects" subtitle="Place bids directly from the project cards.">
        {message ? <p className="mb-4 text-sm text-brand-600">{message}</p> : null}
        <ProjectGrid projects={projects}>
          {(project) => (
            <ProjectCard
              key={project.id}
              project={project}
              badge={data.preferred.some((item) => item.id === project.id) ? <StatusPill tone="brand">Preferred</StatusPill> : null}
            >
              <div className="mt-5 grid gap-4">
                <Field label="Bid amount">
                  <input
                    className={inputClassName}
                    type="number"
                    placeholder="Enter your price"
                    value={forms[project.id]?.bid_amount || ""}
                    onChange={(e) => setForms((s) => ({ ...s, [project.id]: { ...s[project.id], bid_amount: e.target.value } }))}
                  />
                </Field>
                <Field label="Proposal">
                  <textarea
                    className={`${inputClassName} min-h-28`}
                    placeholder="Describe your delivery plan"
                    value={forms[project.id]?.proposal || ""}
                    onChange={(e) => setForms((s) => ({ ...s, [project.id]: { ...s[project.id], proposal: e.target.value } }))}
                  />
                </Field>
                <PrimaryButton onClick={() => submitBid(project.id)} disabled={submittingId === project.id}>
                  {submittingId === project.id ? "Submitting..." : "Place Bid"}
                </PrimaryButton>
              </div>
            </ProjectCard>
          )}
        </ProjectGrid>
      </SectionCard>
    </PageShell>
  );
}

export function MyBidsPage() {
  const { loading, data, error } = useFreelancerData();
  if (loading) return <PageShell title="My Bids" subtitle="Loading your bids..." />;
  if (error) return <PageShell title="My Bids" subtitle={error} />;

  return (
    <PageShell title="My Bids" subtitle="Track every submitted proposal separately from discovery and active work.">
      <SectionCard title="Submitted Bids" subtitle="Pending, accepted, and rejected bids live here with clear status treatment.">
        <ProjectGrid projects={data.pipeline}>
          {(project) => (
            <ProjectCard
              key={project.bid.id}
              project={project}
              badge={<StatusPill tone={project.bid.status === "rejected" ? "danger" : project.bid.status === "approved" ? "success" : "warning"}>{project.bid.status}</StatusPill>}
            >
              <div className="mt-5 space-y-2 text-sm text-slate-500">
                <p>Your Bid: ${project.bid.bid_amount}</p>
                <p>{project.bid.proposal}</p>
              </div>
            </ProjectCard>
          )}
        </ProjectGrid>
      </SectionCard>
    </PageShell>
  );
}

export function ActiveWorkPage() {
  const { loading, data, error } = useFreelancerData();
  if (loading) return <PageShell title="Active Work" subtitle="Loading assigned projects..." />;
  if (error) return <PageShell title="Active Work" subtitle={error} />;

  return (
    <PageShell title="Active Work" subtitle="Assigned projects now have their own focused page instead of competing with discovery and bids.">
      <SectionCard title="Ongoing Projects" subtitle="Use this view to stay on top of approved work and current payment status.">
        <ProjectGrid projects={data.active}>
          {(project) => (
            <ProjectCard key={project.id} project={project} badge={<StatusPill tone="success">{project.payment_status || "Assigned"}</StatusPill>}>
              <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                <p>Bid accepted at ${project.bid.bid_amount}</p>
                <p>Project status: {project.status}</p>
              </div>
            </ProjectCard>
          )}
        </ProjectGrid>
      </SectionCard>
    </PageShell>
  );
}

export function FreelancerHistoryPage() {
  const { loading, data, error } = useFreelancerData();
  if (loading) return <PageShell title="History" subtitle="Loading completed work..." />;
  if (error) return <PageShell title="History" subtitle={error} />;

  const earnings = data.history.reduce((sum, project) => sum + Number(project.bid.bid_amount || 0), 0);

  return (
    <PageShell title="History" subtitle="Completed work and earnings are isolated here so your operational pages stay uncluttered.">
      <div className="grid gap-5 md:grid-cols-2">
        <StatCard label="Completed Projects" value={data.history.length} hint="Released and finished work" />
        <StatCard label="Earnings Summary" value={`$${earnings}`} hint="Based on released approved bids" />
      </div>

      <SectionCard title="Completed Projects" subtitle="Review closed projects and released earnings in one clean archive.">
        <ProjectGrid projects={data.history}>
          {(project) => (
            <ProjectCard key={project.id} project={project} badge={<StatusPill tone="success">Completed</StatusPill>}>
              <div className="mt-5 text-sm text-slate-500">Earnings: ${project.bid.bid_amount}</div>
            </ProjectCard>
          )}
        </ProjectGrid>
      </SectionCard>
    </PageShell>
  );
}
