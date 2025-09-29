const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
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
  items: [
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
    enum: [
      "pending",
      "processing",
      "succeeded",
      "failed",
      "canceled",
      "requires_action",
    ],
    default: "pending",
  },
  stripeStatus: {
    type: String, // Raw Stripe status
  },
  failureReason: {
    type: String, // Reason for failure if payment failed
  },
  currency: {
    type: String,
    default: "eur",
  },
  amountReceived: {
    type: Number, // Actual amount received (in cents)
  },
  refunded: {
    type: Boolean,
    default: false,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  orderCreated: {
    type: Boolean,
    default: false, // Whether an order was created from this payment
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  metadata: {
    type: Map,
    of: String, // Store additional Stripe metadata
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
paymentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries (stripeSessionId already indexed via unique: true)
paymentSchema.index({ "customerInfo.email": 1 });
paymentSchema.index({ paymentStatus: 1 });
paymentSchema.index({ createdAt: -1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
