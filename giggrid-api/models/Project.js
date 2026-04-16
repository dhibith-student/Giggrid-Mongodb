const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    budget: { type: Number, default: 0 },
    category: { type: String, default: "" },
    client_id: { type: String, ref: "User", required: true },
    status: {
      type: String,
      enum: ["open", "closed", "removed"],
      default: "open",
    },
    payment_status: {
      type: String,
      enum: ["not_deposited", "deposited", "released"],
      default: "not_deposited",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false,
  },
);

projectSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Project", projectSchema);
