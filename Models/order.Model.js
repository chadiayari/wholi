const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  stripeSessionId: {
    type: String,
    required: true,
    unique: true,
  },
  paymentIntentId: {
    type: String,
  },
  customerInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
  },
  deliveryAddress: {
    line1: { type: String, required: true },
    city: { type: String, required: true },
    postal_code: { type: String, required: true },
    country: { type: String, required: true },
  },
  deliveryMethod: {
    type: String,
    enum: ["domicile", "point_relais"],
    required: true,
  },
  paymentMethod: {
    type: String,
    default: "card",
  },
  products: [
    {
      id: { type: Number },
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: String },
    },
  ],
  pricing: {
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "paid", "failed", "refunded"],
    default: "pending",
  },
  orderStatus: {
    type: String,
    enum: [
      "pending",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ],
    default: "pending",
  },
  notes: {
    type: String,
    default: "",
  },
  statusHistory: [
    {
      status: String,
      timestamp: { type: Date, default: Date.now },
      updatedBy: String, // admin email or system
      note: String,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving and track status changes
orderSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  // Track status changes
  if (this.isModified("orderStatus") && !this.isNew) {
    this.statusHistory.push({
      status: this.orderStatus,
      timestamp: new Date(),
      updatedBy: this.lastUpdatedBy || "system",
      note: this.lastStatusNote || "",
    });
  }

  next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
