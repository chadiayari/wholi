const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Send order status change email to customer
const sendOrderStatusEmail = async (order, previousStatus, newStatus) => {
  const statusMessages = {
    confirmed: "Votre commande a été confirmée et est en cours de traitement.",
    preparing: "Votre commande est en cours de préparation.",
    shipped: "Votre commande a été expédiée et est en route vers vous.",
    delivered: "Votre commande a été livrée avec succès.",
    cancelled: "Votre commande a été annulée.",
  };

  const statusSubjects = {
    confirmed: "Commande confirmée",
    preparing: "Commande en préparation",
    shipped: "Commande expédiée",
    delivered: "Commande livrée",
    cancelled: "Commande annulée",
  };

  const sendSmtpEmail = {
    to: [
      {
        email: order.customerInfo.email,
        name: order.customerInfo.name,
      },
    ],
    sender: {
      name: "Milkd",
      email: "contact@codini.tn",
    },
    subject: `Milkd - ${
      statusSubjects[newStatus] || "Mise à jour de commande"
    }`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Mise à jour de votre commande</h2>
        <p>Bonjour ${order.customerInfo.name},</p>
        <p>${
          statusMessages[newStatus] ||
          `Le statut de votre commande a été mis à jour vers: ${newStatus}`
        }</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails de la commande</h3>
          <p><strong>Numéro de commande:</strong> ${order.stripeSessionId}</p>
          <p><strong>Statut:</strong> ${newStatus}</p>
          <p><strong>Total:</strong> ${order.pricing.total}€</p>
        </div>

        ${
          order.notes
            ? `
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0;">Note:</h4>
          <p>${order.notes}</p>
        </div>
        `
            : ""
        }

        <p>Merci de votre confiance !</p>
        <p>L'équipe Milkd</p>
      </div>
    `,
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Status change email sent to: ${order.customerInfo.email}`);
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

// Send new order notification to admin
const sendNewOrderNotificationToAdmin = async (order) => {
  const productsHtml = order.products
    .map(
      (product) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${product.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${product.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${product.price}€</td>
      </tr>
    `
    )
    .join("");

  const sendSmtpEmail = {
    to: [
      {
        email: process.env.ADMIN_EMAIL,
      },
    ],
    sender: {
      name: "WHOLI",
      email: "contact@codini.tn",
    },
    subject: `Nouvelle commande Milkd - ${order.stripeSessionId}`,
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
          <p><strong>ID de session Stripe:</strong> ${
            order.stripeSessionId
          }</p>
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

// Send order confirmation email to customer
const sendOrderConfirmationEmail = async (order) => {
  const productsHtml = order.products
    .map(
      (product) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${product.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${product.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${product.price}€</td>
      </tr>
    `
    )
    .join("");

  const sendSmtpEmail = {
    to: [
      {
        email: order.customerInfo.email,
      },
    ],
    sender: {
      name: "WHOLI",
      email: "contact@codini.tn",
    },
    subject: `Milkd - Confirmation de votre commande`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Merci pour votre commande !</h2>
        <p>Bonjour ${order.customerInfo.name},</p>
        <p>Nous avons bien reçu votre commande et le paiement a été confirmé. Votre commande sera préparée dans les plus brefs délais.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Détails de votre commande</h3>
          <p><strong>Numéro de commande:</strong> ${
            order.stripeSessionId
          }</p>
          <p><strong>Date de commande:</strong> ${new Date(
            order.createdAt
          ).toLocaleDateString("fr-FR")}</p>
          <p><strong>Statut:</strong> ${order.orderStatus}</p>
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

        <p>Vous recevrez un email de suivi avec les informations de livraison dès que votre commande sera expédiée.</p>
        <p>Merci de votre confiance !</p>
        <p>L'équipe Milkd</p>
      </div>
    `,
  };

  try {
    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(
      `✅ Order confirmation email sent to: ${order.customerInfo.email}`
    );
    return { success: true, data: response };
  } catch (error) {
    console.error("❌ Error sending order confirmation email:", error);
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
  sendNewOrderNotificationToAdmin,
  sendOrderConfirmationEmail,
};
