import mongoose from "mongoose";

const customerActivityMigrationSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { timestamps: true }
);

export const CustomerActivityMigration = mongoose.model(
  "CustomerActivityMigration",
  customerActivityMigrationSchema
);
