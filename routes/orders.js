const express = require("express");
const Order = require("../Models/order.Model");
const {
  sendOrderStatusEmail,
  VALID_ORDER_STATUSES,
} = require("../controllers/emailController");

const router = express.Router();

// GET /api/orders - Fetch all orders (admin only - add auth middleware if needed)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Error fetching orders" });
  }
});

// GET /api/orders/statuses - Get valid order statuses for admin
router.get("/statuses", (req, res) => {
  res.status(200).json({
    statuses: VALID_ORDER_STATUSES,
    flow: "confirmed → preparing → shipped",
    templates: {
      confirmed: 23,
      preparing: 24,
      shipped: 25,
    },
  });
});

// GET /api/orders/:id - Get specific order
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: "Error fetching order" });
  }
});

// PATCH /api/orders/:id/status - Update order status
// Valid statuses: confirmed -> preparing -> shipped
router.patch("/:id/status", async (req, res) => {
  try {
    const { orderStatus } = req.body;

    if (!orderStatus) {
      return res.status(400).json({ error: "Order status is required" });
    }

    // Only allow the 3 valid statuses that have Brevo templates
    if (!VALID_ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        error: "Invalid order status",
        validStatuses: VALID_ORDER_STATUSES,
        message: "Status must be one of: confirmed, preparing, shipped",
      });
    }

    // Get current order to check status transition and send email
    const currentOrder = await Order.findById(req.params.id);
    if (!currentOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const previousStatus = currentOrder.orderStatus;

    // Validate status transition (must follow the order: confirmed -> preparing -> shipped)
    const currentIndex = VALID_ORDER_STATUSES.indexOf(previousStatus);
    const newIndex = VALID_ORDER_STATUSES.indexOf(orderStatus);

    // Allow same status (no change) or moving forward in the flow
    if (currentIndex !== -1 && newIndex < currentIndex) {
      return res.status(400).json({
        error: "Invalid status transition",
        message: `Cannot change from '${previousStatus}' to '${orderStatus}'. Status can only move forward.`,
        currentStatus: previousStatus,
        allowedNextStatuses: VALID_ORDER_STATUSES.slice(currentIndex),
      });
    }

    // Update order status
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, updatedAt: Date.now() },
      { new: true }
    );

    // Send email notification to customer if status changed
    if (previousStatus !== orderStatus) {
      try {
        const emailResult = await sendOrderStatusEmail(
          order,
          previousStatus,
          orderStatus
        );
        if (emailResult.success) {
          console.log(
            `✅ Status email sent for order ${order._id}: ${previousStatus} -> ${orderStatus}`
          );
        } else {
          console.error(
            `❌ Failed to send status email for order ${order._id}:`,
            emailResult.details
          );
        }
      } catch (emailError) {
        console.error("❌ Error sending status email:", emailError);
        // Don't fail the status update if email fails
      }
    }

    res.status(200).json({
      ...order.toObject(),
      statusChanged: previousStatus !== orderStatus,
      previousStatus,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Error updating order status" });
  }
});

// DELETE /api/orders/:id - Delete order (admin only)
router.delete("/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ error: "Error deleting order" });
  }
});

module.exports = router;
