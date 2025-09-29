const express = require("express");
const Payment = require("../Models/payment.Model");

const router = express.Router();

// GET /api/payments - Fetch all payments (admin only)
router.get("/", async (req, res) => {
  try {
    const {
      status,
      email,
      from_date,
      to_date,
      page = 1,
      limit = 50,
    } = req.query;

    // Build filter query
    const filter = {};

    if (status) {
      filter.paymentStatus = status;
    }

    if (email) {
      filter["customerInfo.email"] = { $regex: email, $options: "i" };
    }

    if (from_date || to_date) {
      filter.createdAt = {};
      if (from_date) filter.createdAt.$gte = new Date(from_date);
      if (to_date) filter.createdAt.$lte = new Date(to_date);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { createdAt: -1 },
    };

    const payments = await Payment.find(filter)
      .populate("orderId")
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const total = await Payment.countDocuments(filter);

    // Calculate statistics
    const stats = await Payment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: "$pricing.total" },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "succeeded"] }, 1, 0] },
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "failed"] }, 1, 0] },
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ["$paymentStatus", "pending"] }, 1, 0] },
          },
          successfulAmount: {
            $sum: {
              $cond: [
                { $eq: ["$paymentStatus", "succeeded"] },
                "$pricing.total",
                0,
              ],
            },
          },
        },
      },
    ]);

    res.status(200).json({
      payments,
      pagination: {
        current: options.page,
        total: Math.ceil(total / options.limit),
        totalRecords: total,
        limit: options.limit,
      },
      statistics: stats[0] || {
        totalPayments: 0,
        totalAmount: 0,
        successfulPayments: 0,
        failedPayments: 0,
        pendingPayments: 0,
        successfulAmount: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Error fetching payments" });
  }
});

// GET /api/payments/:id - Get specific payment
router.get("/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id).populate("orderId");
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Error fetching payment" });
  }
});

// GET /api/payments/session/:sessionId - Get payment by Stripe session ID
router.get("/session/:sessionId", async (req, res) => {
  try {
    const payment = await Payment.findOne({
      stripeSessionId: req.params.sessionId,
    }).populate("orderId");

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.status(200).json(payment);
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: "Error fetching payment" });
  }
});

// GET /api/payments/customer/:email - Get payments by customer email
router.get("/customer/:email", async (req, res) => {
  try {
    const payments = await Payment.find({
      "customerInfo.email": req.params.email,
    })
      .populate("orderId")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (error) {
    console.error("Error fetching customer payments:", error);
    res.status(500).json({ error: "Error fetching customer payments" });
  }
});

// PATCH /api/payments/:id/refund - Process refund
router.patch("/:id/refund", async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.paymentStatus !== "succeeded") {
      return res
        .status(400)
        .json({ error: "Can only refund successful payments" });
    }

    // Process refund with Stripe
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to cents
      reason: reason || "requested_by_customer",
    });

    // Update payment record
    payment.refunded = true;
    payment.refundAmount = refund.amount / 100;
    payment.paymentStatus = amount ? "partially_refunded" : "refunded";
    payment.updatedAt = Date.now();

    await payment.save();

    res.status(200).json({
      message: "Refund processed successfully",
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      },
      payment,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res
      .status(500)
      .json({ error: "Error processing refund", details: error.message });
  }
});

// DELETE /api/payments/:id - Delete payment record (admin only)
router.delete("/:id", async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.status(200).json({ message: "Payment record deleted successfully" });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({ error: "Error deleting payment" });
  }
});

module.exports = router;
