const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const nodemailer = require("nodemailer");
const Order = require("../Models/order.Model");
const Payment = require("../Models/payment.Model");
const {
  sendNewOrderNotificationToAdmin,
  sendOrderConfirmedEmail,
} = require("./emailController");

// Create checkout session
const createCheckoutSession = async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("Request headers:", req.headers);

    const {
      items,
      customer,
      delivery_method,
      payment_method,
      total,
      success_url,
      cancel_url,
    } = req.body;

    // Validate required fields
    if (!items || !customer || !Array.isArray(items)) {
      console.log("Validation failed:", {
        items,
        customer,
        delivery_method,
        total,
      });
      return res.status(400).json({
        error: "Missing required fields: items, customer",
        received: { items, customer, delivery_method, total },
      });
    }

    // Create line items for Stripe
    const lineItems = items.map((item) => {
      // Validate image URL - Stripe only accepts fully qualified HTTPS URLs
      const validImageUrl =
        item.image &&
        (item.image.startsWith("https://") || item.image.startsWith("http://"))
          ? item.image
          : null;

      const productData = {
        name: item.name,
        // description: item.description || "",
      };

      // Only add images if we have a valid URL
      if (validImageUrl) {
        productData.images = [validImageUrl];
      }

      return {
        price_data: {
          currency: "eur",
          product_data: productData,
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      };
    });

    // Calculate delivery fee based on delivery method
    const deliveryFee = delivery_method === "domicile" ? 5.0 : 0; // Example: 5€ for home delivery

    // Add delivery fee if applicable
    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "eur",
          product_data: {
            name: "Frais de livraison",
            description:
              delivery_method === "domicile"
                ? "Livraison à domicile"
                : "Point relais",
          },
          unit_amount: Math.round(deliveryFee * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Validate URLs before creating session
    const frontendUrl =
      process.env.FRONTEND_URL || "https://wholi-production.up.railway.app";

    if (
      !frontendUrl ||
      (!frontendUrl.startsWith("http://") &&
        !frontendUrl.startsWith("https://"))
    ) {
      console.error("Invalid FRONTEND_URL:", frontendUrl);
      return res.status(500).json({
        error: "Server configuration error",
        details: "FRONTEND_URL environment variable is not properly configured",
      });
    }

    const finalSuccessUrl =
      success_url ||
      `${frontendUrl}/confirmation?session_id={CHECKOUT_SESSION_ID}`;
    const finalCancelUrl = cancel_url || `${frontendUrl}/commande`;

    console.log("Using URLs:", { finalSuccessUrl, finalCancelUrl });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      customer_email: customer.email,
      metadata: {
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone || "",
        deliveryAddress: JSON.stringify(customer.address),
        deliveryMethod: delivery_method,
        paymentMethod: payment_method || "card",
        orderTotal: total.toString(),
      },
      locale: "fr",
    });

    // Save payment attempt to database
    await savePaymentAttempt(session, {
      items,
      customer,
      delivery_method,
      payment_method,
      total,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      details: error.message,
    });
  }
};

// Retrieve checkout session
const getCheckoutSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    // Return session data
    res.json({
      id: session.id,
      payment_status: session.payment_status,
      amount_total: session.amount_total,
      currency: session.currency,
      customer_email: session.customer_email,
      metadata: session.metadata,
      line_items: session.line_items,
      payment_intent: session.payment_intent,
    });
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    res.status(500).json({
      error: "Failed to retrieve checkout session",
      details: error.message,
    });
  }
};

// Handle Stripe webhooks
const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // Parse raw webhook data for testing
      event = JSON.parse(req.body);
      console.log("⚠️  Webhook signature verification SKIPPED for testing");
    }
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      console.log("💳 Payment succeeded for session:", session.id);
      console.log("Session metadata:", session.metadata);
      console.log("Session amount_total:", session.amount_total);

      try {
        // Update payment status to succeeded
        await updatePaymentStatus(session.id, "succeeded", {
          stripeStatus: session.payment_status,
          paymentIntentId: session.payment_intent,
          amountReceived: session.amount_total,
        });

        // Save order to database and link to payment
        console.log("🛒 Attempting to save order to database...");
        const savedOrder = await saveOrderToDatabase(session);
        if (savedOrder) {
          console.log("✅ Order saved successfully:", savedOrder._id);
          await updatePaymentStatus(session.id, "succeeded", {
            orderId: savedOrder._id,
          });

          // Send new order notification to admin
          try {
            await sendNewOrderNotificationToAdmin(savedOrder);
            console.log("📧 New order notification sent to admin");
          } catch (emailError) {
            console.error("❌ Failed to send admin notification:", emailError);
          }

          // Send order confirmation to customer using Brevo template 23
          try {
            await sendOrderConfirmedEmail(savedOrder);
            console.log("📧 Order confirmation (template 23) sent to customer");
          } catch (emailError) {
            console.error(
              "❌ Failed to send customer confirmation:",
              emailError
            );
          }
        } else {
          console.error("❌ Failed to save order to database");
        }
      } catch (error) {
        console.error("❌ Error processing checkout.session.completed:", error);
      }

      break;

    case "checkout.session.expired":
      const expiredSession = event.data.object;
      console.log("Session expired:", expiredSession.id);

      await updatePaymentStatus(expiredSession.id, "failed", {
        stripeStatus: "expired",
        failureReason: "Session expired",
      });
      break;

    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("Payment intent succeeded:", paymentIntent.id);

      // Find payment by payment intent ID and update
      const payment = await Payment.findOne({
        paymentIntentId: paymentIntent.id,
      });
      if (payment) {
        await updatePaymentStatus(payment.stripeSessionId, "succeeded", {
          stripeStatus: paymentIntent.status,
          amountReceived: paymentIntent.amount_received,
        });
      }
      break;

    case "payment_intent.payment_failed":
      const failedIntent = event.data.object;
      console.log("Payment failed:", failedIntent.id);

      const failedPayment = await Payment.findOne({
        paymentIntentId: failedIntent.id,
      });
      if (failedPayment) {
        await updatePaymentStatus(failedPayment.stripeSessionId, "failed", {
          stripeStatus: failedIntent.status,
          failureReason:
            failedIntent.last_payment_error?.message || "Payment failed",
        });
      }
      break;

    case "payment_intent.canceled":
      const canceledIntent = event.data.object;
      console.log("Payment canceled:", canceledIntent.id);

      const canceledPayment = await Payment.findOne({
        paymentIntentId: canceledIntent.id,
      });
      if (canceledPayment) {
        await updatePaymentStatus(canceledPayment.stripeSessionId, "canceled", {
          stripeStatus: canceledIntent.status,
          failureReason: "Payment canceled by customer",
        });
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Save payment attempt to database
const savePaymentAttempt = async (session, orderData) => {
  try {
    const deliveryFee = orderData.delivery_method === "domicile" ? 5.0 : 0;

    const payment = new Payment({
      stripeSessionId: session.id,
      customerInfo: {
        name: orderData.customer.name,
        email: orderData.customer.email,
        phone: orderData.customer.phone,
      },
      deliveryAddress: orderData.customer.address,
      deliveryMethod: orderData.delivery_method,
      paymentMethod: orderData.payment_method || "card",
      items: orderData.items,
      pricing: {
        subtotal: orderData.total - deliveryFee,
        deliveryFee: deliveryFee,
        total: orderData.total + deliveryFee,
      },
      paymentStatus: "pending",
      stripeStatus: session.payment_status,
      currency: session.currency || "eur",
      metadata: new Map(Object.entries(session.metadata || {})),
    });

    await payment.save();
    console.log("Payment attempt saved:", payment._id);
    return payment;
  } catch (error) {
    console.error("Error saving payment attempt:", error);
  }
};

// Update payment status
const updatePaymentStatus = async (sessionId, status, additionalData = {}) => {
  try {
    const updateData = {
      paymentStatus: status,
      stripeStatus: additionalData.stripeStatus,
      updatedAt: Date.now(),
    };

    if (additionalData.paymentIntentId) {
      updateData.paymentIntentId = additionalData.paymentIntentId;
    }

    if (additionalData.amountReceived) {
      updateData.amountReceived = additionalData.amountReceived;
    }

    if (additionalData.failureReason) {
      updateData.failureReason = additionalData.failureReason;
    }

    if (additionalData.orderId) {
      updateData.orderCreated = true;
      updateData.orderId = additionalData.orderId;
    }

    const payment = await Payment.findOneAndUpdate(
      { stripeSessionId: sessionId },
      updateData,
      { new: true }
    );

    console.log("Payment status updated:", payment?._id, status);
    return payment;
  } catch (error) {
    console.error("Error updating payment status:", error);
  }
};

// Save order to database
const saveOrderToDatabase = async (session) => {
  try {
    // Parse metadata
    const deliveryAddress = JSON.parse(session.metadata.deliveryAddress);

    // Get line items to save product details
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items.data.price.product"],
      }
    );

    const products = sessionWithLineItems.line_items.data
      .filter((item) => !item.price.product.name.includes("Frais de livraison"))
      .map((item, index) => ({
        id: index + 1, // Generate ID since we don't have it from Stripe
        name: item.price.product.name,
        // description: item.price.product.description || "",
        price: item.price.unit_amount / 100,
        quantity: item.quantity,
        image: item.price.product.images[0] || "",
      }));

    const deliveryFeeItem = sessionWithLineItems.line_items.data.find((item) =>
      item.price.product.name.includes("Frais de livraison")
    );

    const order = new Order({
      stripeSessionId: session.id,
      paymentIntentId: session.payment_intent,
      customerInfo: {
        name: session.metadata.customerName,
        email: session.customer_email,
        phone: session.metadata.customerPhone,
      },
      deliveryAddress,
      deliveryMethod: session.metadata.deliveryMethod,
      paymentMethod: session.metadata.paymentMethod || "card",
      products,
      pricing: {
        subtotal:
          (session.amount_total -
            (deliveryFeeItem ? deliveryFeeItem.amount_total : 0)) /
          100,
        deliveryFee: deliveryFeeItem ? deliveryFeeItem.amount_total / 100 : 0,
        total: session.amount_total / 100,
      },
      paymentStatus: "paid",
      orderStatus: "confirmed",
    });

    await order.save();
    console.log("Order saved to database:", order._id);
    return order;
  } catch (error) {
    console.error("Error saving order to database:", error);
    return null;
  }
};

module.exports = {
  createCheckoutSession,
  getCheckoutSession,
  handleWebhook,
};
