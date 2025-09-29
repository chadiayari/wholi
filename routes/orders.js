const express = require("express");
const Order = require("../Models/order.Model");

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
router.patch("/:id/status", async (req, res) => {
  try {
    const { orderStatus } = req.body;

    if (!orderStatus) {
      return res.status(400).json({ error: "Order status is required" });
    }

    const validStatuses = [
      "pending",
      "confirmed",
      "preparing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: "Invalid order status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, updatedAt: Date.now() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.status(200).json(order);
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
