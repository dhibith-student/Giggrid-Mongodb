import { getAllBids, getAllProjects, getAllUsers, updateBid, updateProject } from "./api";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString();
}

function byCreatedAtDesc(left, right) {
  return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();
}

function createUserMap(users) {
  return new Map(asArray(users).map((user) => [user.id, user]));
}

function createProjectMap(projects) {
  return new Map(asArray(projects).map((project) => [project.id, project]));
}

function getUserDisplayName(user, fallback) {
  return user?.full_name || user?.email || fallback;
}

function buildMetrics(users, projects, bids) {
  const userRows = asArray(users);
  const projectRows = asArray(projects);
  const bidRows = asArray(bids);

  return {
    totalUsers: userRows.length,
    totalFreelancers: userRows.filter((user) => user?.role === "freelancer").length,
    totalClients: userRows.filter((user) => user?.role === "client").length,
    totalProjects: projectRows.length,
    openProjects: projectRows.filter((project) => project?.status === "open").length,
    totalBids: bidRows.length,
    pendingBids: bidRows.filter((bid) => bid?.status === "pending").length,
    approvedBids: bidRows.filter((bid) => bid?.status === "approved").length,
    rejectedBids: bidRows.filter((bid) => bid?.status === "rejected").length,
  };
}

function buildProjectRows(projects, userMap, bids) {
  const bidCountByProject = asArray(bids).reduce((map, bid) => {
    const current = map.get(bid.project_id) || 0;
    map.set(bid.project_id, current + 1);
    return map;
  }, new Map());

  return asArray(projects)
    .slice()
    .sort(byCreatedAtDesc)
    .map((project) => {
      const client = userMap.get(project.client_id);

      return {
        id: project.id,
        title: project.title || "Untitled project",
        description: project.description || "No description provided.",
        budget: asNumber(project.budget),
        clientId: project.client_id || "",
        clientName: getUserDisplayName(client, "Unknown client"),
        status: project.status || "unknown",
        paymentStatus: project.payment_status || "unknown",
        createdAt: project.created_at || "",
        createdDateLabel: formatDate(project.created_at) || "-",
        bidCount: bidCountByProject.get(project.id) || 0,
      };
    });
}

function buildBidRows(bids, projectMap, userMap) {
  return asArray(bids)
    .slice()
    .sort(byCreatedAtDesc)
    .map((bid) => {
      const project = projectMap.get(bid.project_id);
      const freelancer = userMap.get(bid.freelancer_id);

      return {
        id: bid.id,
        projectId: bid.project_id || "",
        projectTitle: project?.title || "Unknown project",
        freelancerId: bid.freelancer_id || "",
        freelancerName: getUserDisplayName(freelancer, "Unknown freelancer"),
        bidAmount: asNumber(bid.bid_amount),
        proposal: bid.proposal || "No proposal provided.",
        status: bid.status || "unknown",
        createdAt: bid.created_at || "",
        createdDateLabel: formatDate(bid.created_at) || "-",
      };
    });
}

function buildUserRows(users) {
  return asArray(users)
    .slice()
    .sort((left, right) => (left?.full_name || left?.email || "").localeCompare(right?.full_name || right?.email || ""))
    .map((user) => ({
      id: user.id,
      fullName: user.full_name || "Unknown user",
      email: user.email || "-",
      phone: user.phone || "-",
      role: user.role || "unknown",
      qualification: user.qualification || "-",
      bio: user.bio || "",
    }));
}

function buildFreelancerRows(users, bids) {
  const bidRows = asArray(bids);

  return asArray(users)
    .filter((user) => user?.role === "freelancer")
    .map((user) => {
      const userBids = bidRows.filter((bid) => bid.freelancer_id === user.id);

      return {
        id: user.id,
        name: getUserDisplayName(user, "Unknown freelancer"),
        bio: user.bio || "No bio provided.",
        totalBidsSubmitted: userBids.length,
        activeBids: userBids.filter((bid) => bid.status === "pending").length,
        approvedBids: userBids.filter((bid) => bid.status === "approved").length,
      };
    })
    .sort((left, right) => right.totalBidsSubmitted - left.totalBidsSubmitted || left.name.localeCompare(right.name));
}

function buildClientRows(users, projects) {
  const projectRows = asArray(projects);

  return asArray(users)
    .filter((user) => user?.role === "client")
    .map((user) => {
      const userProjects = projectRows.filter((project) => project.client_id === user.id);

      return {
        id: user.id,
        name: getUserDisplayName(user, "Unknown client"),
        email: user.email || "-",
        totalProjectsPosted: userProjects.length,
        activeProjects: userProjects.filter((project) => project.status === "open").length,
      };
    })
    .sort((left, right) => right.totalProjectsPosted - left.totalProjectsPosted || left.name.localeCompare(right.name));
}

function buildAnalytics(projectRows, bidRows, clientRows, freelancerRows) {
  const bidsPerProject = projectRows
    .map((project) => ({
      label: project.title,
      value: project.bidCount,
    }))
    .filter((item) => item.value > 0)
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));

  const topProject = bidsPerProject[0]
    ? {
        projectTitle: bidsPerProject[0].label,
        bidCount: bidsPerProject[0].value,
      }
    : null;

  const mostActiveFreelancer = freelancerRows[0]
    ? {
        name: freelancerRows[0].name,
        totalBidsSubmitted: freelancerRows[0].totalBidsSubmitted,
        approvedBids: freelancerRows[0].approvedBids,
      }
    : null;

  const mostActiveClient = clientRows[0]
    ? {
        name: clientRows[0].name,
        totalProjectsPosted: clientRows[0].totalProjectsPosted,
        activeProjects: clientRows[0].activeProjects,
      }
    : null;

  const bidStatusDistribution = [
    { label: "Pending", value: bidRows.filter((bid) => bid.status === "pending").length, color: "#F59E0B" },
    { label: "Approved", value: bidRows.filter((bid) => bid.status === "approved").length, color: "#10B981" },
    { label: "Rejected", value: bidRows.filter((bid) => bid.status === "rejected").length, color: "#EF4444" },
  ];

  const projectsVsBids = [
    { label: "Projects", value: projectRows.length },
    { label: "Bids", value: bidRows.length },
  ];

  return {
    mostActiveFreelancer,
    mostActiveClient,
    topProject,
    bidsPerProject: bidsPerProject.slice(0, 8),
    bidStatusDistribution,
    projectsVsBids,
  };
}

export async function fetchAdminWorkspace() {
  const [users, projects, bids] = await Promise.all([getAllUsers(), getAllProjects(), getAllBids()]);
  const userMap = createUserMap(users);
  const projectMap = createProjectMap(projects);

  const metrics = buildMetrics(users, projects, bids);
  const projectRows = buildProjectRows(projects, userMap, bids);
  const bidRows = buildBidRows(bids, projectMap, userMap);
  const userRows = buildUserRows(users);
  const freelancerRows = buildFreelancerRows(users, bids);
  const clientRows = buildClientRows(users, projects);
  const analytics = buildAnalytics(projectRows, bidRows, clientRows, freelancerRows);

  return {
    metrics,
    projectRows,
    bidRows,
    userRows,
    freelancerRows,
    clientRows,
    claimsRows: [],
    analytics,
  };
}

export async function updateBidStatus(bidId, status) {
  await updateBid(bidId, { status });
}

export async function closeProject(projectId) {
  await updateProject(projectId, { status: "closed" });
}
