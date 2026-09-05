import mongoose from "mongoose";

const customerActivitySchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerMobile: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["created", "updated", "renewed", "payment_recorded", "deleted", "baseline_import"],
    },
    plan: {
      type: String,
    },
    planType: {
      type: String,
      enum: ["both", "lunch", "dinner"],
    },
    amount: {
      type: Number,
    },
    paidAmount: {
      type: Number,
    },
    paymentAmount: {
      type: Number,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

customerActivitySchema.index({ timestamp: -1 });
customerActivitySchema.index({ customerMobile: 1, timestamp: -1 });
customerActivitySchema.index(
  { customerId: 1, action: 1 },
  { unique: true, partialFilterExpression: { action: "baseline_import" } }
);

export const CustomerActivity = mongoose.model("CustomerActivity", customerActivitySchema);
