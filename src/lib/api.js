const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const TOKEN_KEY = "giggrid_token";

function getHeaders(includeJson = true) {
  const headers = {};
  const token = localStorage.getItem(TOKEN_KEY);

  if (includeJson) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...getHeaders(options.body !== undefined || options.method && options.method !== "GET"),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(payload?.error || "Request failed.");
  }

  return payload;
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("selectedRole");
}

export async function register(payload) {
  const data = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return data.user;
}

export async function login(email, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem(TOKEN_KEY, data.token);
  return data.user;
}

export async function getCurrentUser() {
  const data = await request("/api/auth/me");
  return data.user;
}

export async function getAllUsers() {
  return request("/api/users");
}

export async function getUserById(userId) {
  return request(`/api/users/${userId}`);
}

export async function updateUserProfile(userId, payload) {
  return request(`/api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getAllProjects() {
  return request("/api/projects");
}

export async function getOpenProjects() {
  return request("/api/projects/open");
}

export async function getProjectsByIds(projectIds) {
  if (!projectIds.length) {
    return [];
  }

  const params = new URLSearchParams({ ids: projectIds.join(",") });
  return request(`/api/projects/by-ids?${params.toString()}`);
}

export async function getClientProjects(clientId) {
  return request(`/api/projects/client/${clientId}`);
}

export async function createProject(payload) {
  return request("/api/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(projectId, payload) {
  return request(`/api/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getAllBids() {
  return request("/api/bids");
}

export async function getBidsByProject(projectId) {
  return request(`/api/bids/project/${projectId}`);
}

export async function getBidsByFreelancer(freelancerId) {
  return request(`/api/bids/freelancer/${freelancerId}`);
}

export async function createBid(payload) {
  return request("/api/bids", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBid(bidId, payload) {
  return request(`/api/bids/${bidId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function rejectOtherBids(projectId, keepBidId) {
  return request(`/api/bids/project/${projectId}/reject-others/${keepBidId}`, {
    method: "PUT",
  });
}

export async function rejectAllBidsForProject(projectId) {
  return request(`/api/bids/project/${projectId}/reject-all`, {
    method: "PUT",
  });
}
