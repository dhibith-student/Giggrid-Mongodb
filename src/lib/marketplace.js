import { getBidsByFreelancer, getOpenProjects, getProjectsByIds } from "./api";

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
  const [openProjects, bids] = await Promise.all([getOpenProjects(), getBidsByFreelancer(userId)]);
  const relatedProjectIds = [...new Set((bids || []).map((bid) => bid.project_id).filter(Boolean))];
  const relatedProjects = await getProjectsByIds(relatedProjectIds);

  const allBids = bids || [];
  const projectMap = new Map([...(openProjects || []), ...(relatedProjects || [])].map((project) => [project.id, project]));
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
