const express = require("express");
const router = express.Router();
const DeliveryDate = require("../Models/deliveryDate.Model");

// GET /api/delivery-date - Get current delivery date for users
router.get("/", async (req, res) => {
  try {
    const deliveryDate = await DeliveryDate.findOne();

    if (!deliveryDate) {
      return res.json({
        success: true,
        data: null,
        message: "No delivery date set",
      });
    }

    res.json({
      success: true,
      data: {
        deliveryDate: deliveryDate.deliveryDate,
        formattedDate: deliveryDate.deliveryDate.toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      },
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

module.exports = router;
