const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    full_name: { type: String, default: "" },
    phone: { type: String, default: "" },
    qualification: { type: String, default: "" },
    preferences: { type: String, default: "" },
    bio: { type: String, default: "" },
    role: {
      type: String,
      enum: ["freelancer", "client", "admin"],
      required: true,
    },
    company_name: { type: String, default: null },
    company_website: { type: String, default: null },
    needs_password_reset: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false,
  },
);

userSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", userSchema);
