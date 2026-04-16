require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Project = require("../models/Project");
const Bid = require("../models/Bid");

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for migration.`);
  }
  return value;
}

async function fetchSupabaseTable(table) {
  const baseUrl = required("SUPABASE_URL").replace(/\/$/, "");
  const key = required("SUPABASE_ANON_KEY");
  const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch ${table} from Supabase: ${response.status} ${body}`);
  }

  return response.json();
}

async function upsertUsers(users) {
  const defaultPassword = required("MIGRATED_USER_PASSWORD");
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  for (const user of users) {
    await User.findByIdAndUpdate(
      user.id,
      {
        _id: user.id,
        email: user.email,
        password: hashedPassword,
        full_name: user.full_name || "",
        phone: user.phone || "",
        qualification: user.qualification || "",
        preferences: user.preferences || "",
        bio: user.bio || "",
        role: user.role,
        company_name: user.company_name ?? null,
        company_website: user.company_website ?? null,
        migrated_from_supabase: true,
        needs_password_reset: true,
        legacy_auth_user_id: user.id,
        created_at: user.created_at ? new Date(user.created_at) : undefined,
        updated_at: user.updated_at ? new Date(user.updated_at) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function upsertProjects(projects) {
  for (const project of projects) {
    await Project.findByIdAndUpdate(
      project.id,
      {
        _id: project.id,
        title: project.title,
        description: project.description || "",
        budget: Number(project.budget || 0),
        category: project.category || "",
        client_id: project.client_id,
        status: project.status || "open",
        payment_status: project.payment_status || "not_deposited",
        created_at: project.created_at ? new Date(project.created_at) : undefined,
        updated_at: project.updated_at ? new Date(project.updated_at) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function upsertBids(bids) {
  for (const bid of bids) {
    await Bid.findByIdAndUpdate(
      bid.id,
      {
        _id: bid.id,
        project_id: bid.project_id,
        freelancer_id: bid.freelancer_id,
        bid_amount: Number(bid.bid_amount || 0),
        proposal: bid.proposal || "",
        status: bid.status || "pending",
        created_at: bid.created_at ? new Date(bid.created_at) : undefined,
        updated_at: bid.updated_at ? new Date(bid.updated_at) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
}

async function migrate() {
  await mongoose.connect(required("MONGODB_URI"), {
    dbName: process.env.MONGO_DB || undefined,
  });

  const [users, projects, bids] = await Promise.all([
    fetchSupabaseTable("users"),
    fetchSupabaseTable("projects"),
    fetchSupabaseTable("bids"),
  ]);

  await upsertUsers(users);
  await upsertProjects(projects);
  await upsertBids(bids);

  console.log(
    JSON.stringify(
      {
        migratedUsers: users.length,
        migratedProjects: projects.length,
        migratedBids: bids.length,
        note: "Migrated users receive a temporary password from MIGRATED_USER_PASSWORD because Supabase Auth password hashes are not available through the anon Data API.",
      },
      null,
      2,
    ),
  );

  process.exit(0);
}

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
