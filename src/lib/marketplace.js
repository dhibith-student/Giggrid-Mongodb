import { supabase } from "./supabase";

export function classifyFreelancerProjects(openProjects, bids, preferences) {
  const biddedIds = new Set(bids.map((bid) => bid.project_id));
  const availableProjects = openProjects.filter((project) => !biddedIds.has(project.id));
  const preferred = [];
  const others = [];

  availableProjects.forEach((project) => {
    const category = (project.category || "").toLowerCase();
    const matches = preferences.some((pref) => category.includes(pref) || pref.includes(category));
    if (matches && category) preferred.push(project);
    else others.push(project);
  });

  return { preferred, others };
}

export async function fetchFreelancerWorkspace(userId, preferences) {
  const [openProjectsResult, bidsResult, bidProjectsResult] = await Promise.all([
    supabase.from("projects").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase
      .from("bids")
      .select("id, project_id, status, bid_amount, proposal")
      .eq("freelancer_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
  ]);

  if (openProjectsResult.error) throw openProjectsResult.error;
  if (bidsResult.error) throw bidsResult.error;
  if (bidProjectsResult.error) throw bidProjectsResult.error;

  const openProjects = openProjectsResult.data;
  const bids = bidsResult.data;
  const bidProjects = bidProjectsResult.data;

  const allBids = bids || [];
  const projectMap = new Map((bidProjects || []).map((project) => [project.id, project]));
  const { preferred, others } = classifyFreelancerProjects(openProjects || [], allBids, preferences);

  const pipeline = [];
  const active = [];
  const history = [];

  allBids.forEach((bid) => {
    const project = projectMap.get(bid.project_id);
    if (!project) return;
    const item = { ...project, bid };
    if (bid.status === "approved" && project.payment_status !== "released") active.push(item);
    else if (bid.status === "approved" && project.payment_status === "released") history.push(item);
    else pipeline.push(item);
  });

  return { preferred, others, pipeline, active, history, bids: allBids };
}
