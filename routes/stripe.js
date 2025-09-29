const express = require("express");
const {
  createCheckoutSession,
  getCheckoutSession,
  handleWebhook,
} = require("../controllers/stripeController");

const router = express.Router();

// Ensure JSON parsing for all routes except webhook
router.use((req, res, next) => {
  if (req.path !== "/webhook") {
    express.json()(req, res, next);
  } else {
    next();
  }
});

// POST /api/stripe/create-checkout-session - Create Stripe checkout session
router.post("/create-checkout-session", createCheckoutSession);

// GET /api/stripe/checkout-session/:sessionId - Retrieve checkout session details
router.get("/checkout-session/:sessionId", getCheckoutSession);

// POST /api/stripe/webhook - Handle Stripe webhooks with raw body
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);

module.exports = router;
