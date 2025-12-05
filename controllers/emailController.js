const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Brevo Template IDs for order status emails
const ORDER_TEMPLATES = {
  confirmed: 23, // Commande confirmée - sent when order is created
  preparing: 24, // Commande en préparation
  shipped: 25, // Commande en cours de livraison
};

// Valid order statuses that admin can set (in order)
const VALID_ORDER_STATUSES = ["confirmed", "preparing", "shipped"];

// Send order status email using Brevo templates
const sendOrderStatusEmail = async (order, previousStatus, newStatus) => {
  const templateId = ORDER_TEMPLATES[newStatus];

  if (!templateId) {
    console.log(`ℹ️ No template configured for status: ${newStatus}`);
    return { success: false, error: "No template for this status" };
  }

  const sendSmtpEmail = {
    to: [
      {
        email: order.customerInfo.email,
        name: order.customerInfo.name,
      },
    ],
    templateId: templateId,
    params: {
      CUSTOMER_NAME: order.customerInfo.name,
      ORDER_ID: order.stripeSessionId,
      ORDER_TOTAL: order.pricing.total.toFixed(2),
      DELIVERY_ADDRESS: `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}, ${order.deliveryAddress.postal_code}`,
      DELIVERY_METHOD:
        order.deliveryMethod === "domicile"
          ? "Livraison à domicile"
          : "Point relais",
      ORDER_DATE: new Date(order.createdAt).toLocaleDateString("fr-FR"),
    },
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(
      `✅ Status change email (template ${templateId}) sent to: ${order.customerInfo.email}`
    );
    return { success: true, data: response };
  } catch (error) {
    console.error("❌ Error sending status change email:", error);
    return {
      success: false,
      error,
      details: {
        message: error.message,
        code: error.response?.body?.code || error.code,
        brevoMessage: error.response?.body?.message,
      },
    };
  }
};

// Send order confirmed email (template 23) - called when order is created
const sendOrderConfirmedEmail = async (order) => {
  const sendSmtpEmail = {
    to: [
      {
        email: order.customerInfo.email,
        name: order.customerInfo.name,
      },
    ],
    templateId: ORDER_TEMPLATES.confirmed,
    params: {
      CUSTOMER_NAME: order.customerInfo.name,
      ORDER_ID: order.stripeSessionId,
      ORDER_TOTAL: order.pricing.total.toFixed(2),
      SUBTOTAL: order.pricing.subtotal.toFixed(2),
      DELIVERY_FEE: order.pricing.deliveryFee.toFixed(2),
      DELIVERY_ADDRESS: `${order.deliveryAddress.line1}, ${order.deliveryAddress.city}, ${order.deliveryAddress.postal_code}`,
      DELIVERY_METHOD:
        order.deliveryMethod === "domicile"
          ? "Livraison à domicile"
          : "Point relais",
      ORDER_DATE: new Date(order.createdAt).toLocaleDateString("fr-FR"),
    },
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(
      `✅ Order confirmed email (template 23) sent to: ${order.customerInfo.email}`
    );
    return { success: true, data: response };
  } catch (error) {
    console.error("❌ Error sending order confirmed email:", error);
    return {
      success: false,
      error,
      details: {
        message: error.message,
        code: error.response?.body?.code || error.code,
        brevoMessage: error.response?.body?.message,
      },
    };
  }
};

// Send new order notification to admin
const sendNewOrderNotificationToAdmin = async () => {
  const sendSmtpEmail = {
    to: [
      {
        email: process.env.ADMIN_EMAIL,
      },
    ],
    sender: {
      name: "WHOLI",
      email: "mohamed.benaicha@milkdfromplants.com",
    },
    subject: `Nouvelle commande Wholi - ${order.stripeSessionId}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Nouvelle commande reçue</h2>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Informations client</h3>
          <p><strong>Nom:</strong> ${order.customerInfo.name}</p>
          <p><strong>Email:</strong> ${order.customerInfo.email}</p>
          <p><strong>Téléphone:</strong> ${
            order.customerInfo.phone || "Non fourni"
          }</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Adresse de livraison</h3>
          <p>${order.deliveryAddress.line1}</p>
          <p>${order.deliveryAddress.city}, ${
      order.deliveryAddress.postal_code
    }</p>
          <p>${order.deliveryAddress.country}</p>
          <p><strong>Méthode de livraison:</strong> ${
            order.deliveryMethod === "domicile"
              ? "Livraison à domicile"
              : "Point relais"
          }</p>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Produits commandés</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #e5e7eb;">
                <th style="padding: 10px; text-align: left;">Produit</th>
                <th style="padding: 10px; text-align: center;">Quantité</th>
                <th style="padding: 10px; text-align: right;">Prix</th>
              </tr>
            </thead>
            <tbody>
              ${productsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; text-align: right;">
            <p><strong>Sous-total: ${order.pricing.subtotal}€</strong></p>
            <p><strong>Frais de livraison: ${
              order.pricing.deliveryFee
            }€</strong></p>
            <p style="font-size: 18px;"><strong>Total: ${
              order.pricing.total
            }€</strong></p>
          </div>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails de la commande</h3>
          <p><strong>ID de session Stripe:</strong> ${order.stripeSessionId}</p>
          <p><strong>Statut de paiement:</strong> ${order.paymentStatus}</p>
          <p><strong>Statut de commande:</strong> ${order.orderStatus}</p>
          <p><strong>Date de commande:</strong> ${new Date(
            order.createdAt
          ).toLocaleDateString("fr-FR")}</p>
        </div>
      </div>
    `,
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ New order notification sent to admin`);
    return { success: true, data: response };
  } catch (error) {
    console.error("❌ Error sending new order notification to admin:", error);
    return {
      success: false,
      error,
      details: {
        message: error.message,
        code: error.response?.body?.code || error.code,
        brevoMessage: error.response?.body?.message,
      },
    };
  }
};

module.exports = {
  sendOrderStatusEmail,
  sendOrderConfirmedEmail,
  sendNewOrderNotificationToAdmin,
  VALID_ORDER_STATUSES,
  ORDER_TEMPLATES,
};
