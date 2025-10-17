const mongoose = require("mongoose");

const deliveryDateSchema = new mongoose.Schema({
  deliveryDate: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
deliveryDateSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update the updatedAt field before saving
deliveryDateSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const DeliveryDate = mongoose.model("DeliveryDate", deliveryDateSchema);

module.exports = DeliveryDate;
