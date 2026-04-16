const mongoose = require("mongoose");

const bidSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    project_id: { type: String, ref: "Project", required: true },
    freelancer_id: { type: String, ref: "User", required: true },
    bid_amount: { type: Number, required: true },
    proposal: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    _id: false,
  },
);

bidSchema.index({ project_id: 1, freelancer_id: 1 }, { unique: true });

bidSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Bid", bidSchema);
