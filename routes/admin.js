const express = require("express");
const router = express.Router();
const Order = require("../Models/order.Model");
const DeliveryDate = require("../Models/deliveryDate.Model");
const ProContact = require("../Models/proContact.Model");
const { sendOrderStatusEmail } = require("../controllers/emailController");

// GET /api/admin/orders - Get all orders with details
router.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }); // Most recent first

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// GET /api/admin/orders/:id - Get specific order details
router.get("/orders/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// PUT /api/admin/orders/:id - Update order status and/or notes
router.put("/orders/:id", async (req, res) => {
  try {
    const { orderStatus, notes, adminEmail } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = order.orderStatus;

    // Update fields if provided
    if (orderStatus && orderStatus !== order.orderStatus) {
      order.orderStatus = orderStatus;
      order.lastUpdatedBy = adminEmail || "admin";
      order.lastStatusNote = notes || "";
    }

    if (notes !== undefined) {
      order.notes = notes;
    }

    await order.save();

    // Send email notification if status changed
    if (orderStatus && orderStatus !== previousStatus) {
      try {
        await sendOrderStatusEmail(order, previousStatus, orderStatus);
        console.log(`📧 Status change email sent for order ${orderId}`);
      } catch (emailError) {
        console.error("❌ Failed to send status change email:", emailError);
      }
    }

    res.json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// POST /api/admin/delivery-date - Set default delivery date
router.post("/delivery-date", async (req, res) => {
  try {
    const { deliveryDate } = req.body;

    if (!deliveryDate) {
      return res.status(400).json({
        success: false,
        message: "Delivery date is required",
      });
    }

    // Find existing delivery date or create new one
    let existingDeliveryDate = await DeliveryDate.findOne();

    if (existingDeliveryDate) {
      // Update existing
      existingDeliveryDate.deliveryDate = new Date(deliveryDate);
      await existingDeliveryDate.save();
    } else {
      // Create new
      existingDeliveryDate = new DeliveryDate({
        deliveryDate: new Date(deliveryDate),
      });
      await existingDeliveryDate.save();
    }

    res.json({
      success: true,
      message: "Delivery date updated successfully",
      data: existingDeliveryDate,
    });
  } catch (error) {
    console.error("Error setting delivery date:", error);
    res.status(500).json({
      success: false,
      message: "Error setting delivery date",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// GET /api/admin/delivery-date - Get current delivery date
router.get("/delivery-date", async (req, res) => {
  try {
    const deliveryDate = await DeliveryDate.findOne();

    res.json({
      success: true,
      data: deliveryDate,
    });
  } catch (error) {
    console.error("Error fetching delivery date:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching delivery date",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// GET /api/admin/pro-contacts - Get all professional contact requests
router.get("/pro-contacts", async (req, res) => {
  try {
    const proContacts = await ProContact.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: proContacts,
      count: proContacts.length,
    });
  } catch (error) {
    console.error("Error fetching pro contacts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching pro contacts",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

// DELETE /api/admin/pro-contacts/:id - Delete a professional contact request
router.delete("/pro-contacts/:id", async (req, res) => {
  try {
    const proContactId = req.params.id;

    const deletedProContact = await ProContact.findByIdAndDelete(proContactId);

    if (!deletedProContact) {
      return res.status(404).json({
        success: false,
        message: "Professional contact request not found",
      });
    }

    res.json({
      success: true,
      message: "Professional contact request deleted successfully",
      data: deletedProContact,
    });
  } catch (error) {
    console.error("Error deleting pro contact:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting pro contact",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal server error",
    });
  }
});

module.exports = router;
