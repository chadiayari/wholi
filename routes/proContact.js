const express = require("express");
const router = express.Router();
const ProContact = require("../Models/proContact.Model");
const axios = require("axios");

// POST /api/pro-contact - Submit professional contact request
router.post("/", async (req, res) => {
  try {
    const {
      companyName,
      contactName,
      email,
      phone,
      businessType,
      location,
      message,
    } = req.body;

    // Validate required fields
    if (
      !companyName ||
      !contactName ||
      !email ||
      !phone ||
      !businessType ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: companyName, contactName, email, phone, businessType, location",
      });
    }

    // Create pro contact in database
    const proContact = new ProContact({
      companyName,
      contactName,
      email,
      phone,
      businessType,
      location,
      message: message || "",
    });

    await proContact.save();

    // Send notification email to admin
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          to: [
            {
              email: process.env.ADMIN_EMAIL,
              name: "Admin Milkd",
            },
          ],
          subject: `Nouvelle demande professionnelle - ${companyName}`,
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Nouvelle demande de contact professionnel</h2>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Informations de l'entreprise</h3>
                <p><strong>Nom de l'entreprise:</strong> ${companyName}</p>
                <p><strong>Nom du contact:</strong> ${contactName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Téléphone:</strong> ${phone}</p>
                <p><strong>Type d'entreprise:</strong> ${businessType}</p>
                <p><strong>Localisation:</strong> ${location}</p>
              </div>

              ${
                message
                  ? `
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Message</h3>
                <p>${message}</p>
              </div>
              `
                  : ""
              }

              <p>Date de demande: ${new Date().toLocaleDateString("fr-FR")}</p>
            </div>
          `,
        },
        {
          headers: {
            accept: "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
          },
        }
      );

      console.log("✅ Pro contact notification sent to admin");
    } catch (emailError) {
      console.error("❌ Error sending pro contact notification:", emailError);
      // Don't fail the request if email fails, contact is already saved
    }

    res.status(200).json({
      success: true,
      message: "Professional contact request submitted successfully",
      data: proContact,
    });
  } catch (error) {
    console.error("Error processing pro contact:", error);

    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.status(400).json({
        success: false,
        error: "This email is already registered for professional contact.",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error processing the request.",
    });
  }
});

module.exports = router;
