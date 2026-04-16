require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");

async function seedAdmin() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGO_DB || undefined,
  });

  const email = "admin@giggrid.com";
  const password = "Admin@123";
  const existing = await User.findOne({ email });
  const hashedPassword = await bcrypt.hash(password, 10);

  if (existing) {
    existing.password = hashedPassword;
    existing.role = "admin";
    existing.full_name = existing.full_name || "GigGrid Admin";
    existing.needs_password_reset = false;
    existing.migrated_from_supabase = false;
    await existing.save();
    console.log(`Admin user ensured: ${email} / ${password}`);
    process.exit(0);
  }

  await User.create({
    _id: crypto.randomUUID(),
    email,
    password: hashedPassword,
    full_name: "GigGrid Admin",
    role: "admin",
    needs_password_reset: false,
  });

  console.log(`Admin created: ${email} / ${password}`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
