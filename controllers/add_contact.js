const Contact = require("../Models/contact.Model");
const axios = require("axios");
const SibApiV3Sdk = require("sib-api-v3-sdk");

const addcontact = async (req, res) => {
  try {
    const { firstName, lastName, email, captchaValue, version, message } =
      req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !captchaValue) {
      return res.status(400).json({
        error:
          "Missing required fields: firstName, lastName, email, captchaValue",
      });
    }

    // Verify reCAPTCHA
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaValue}`,
      {},
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      }
    );

    const captchaValidation = response.data;

    if (!captchaValidation.success) {
      return res.status(400).json({ error: "reCAPTCHA validation failed" });
    }

    // Create contact in database
    const contact = new Contact({
      firstName,
      lastName,
      email,
      version: version || "",
      message: message || "",
    });

    await contact.save();

    // Send email via Brevo
    try {
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          to: [
            {
              email: email,
              name: `${firstName} ${lastName}`,
            },
          ],
          templateId: 4,
          params: {
            firstName: firstName,
            lastName: lastName,
            message: message || "",
          },
          headers: {
            "X-Mailin-custom":
              "custom_header_1:custom_value_1|custom_header_2:custom_value_2|custom_header_3:custom_value_3",
            charset: "iso-8859-1",
          },
        },
        {
          headers: {
            accept: "application/json",
            "api-key": process.env.BREVO_API_KEY,
            "content-type": "application/json",
          },
        }
      );

      // Add contact to Brevo list
      let defaultClient = SibApiV3Sdk.ApiClient.instance;
      let apiKey = defaultClient.authentications["api-key"];
      apiKey.apiKey = process.env.BREVO_API_KEY;

      let apiInstance = new SibApiV3Sdk.ContactsApi();
      let createContact = new SibApiV3Sdk.CreateContact();
      createContact.email = email;
      createContact.listIds = [2];
      createContact.attributes = {
        FIRSTNAME: firstName,
        LASTNAME: lastName,
        MESSAGE: message || "",
      };

      await apiInstance.createContact(createContact).then(
        function (data) {
          console.log(
            "Brevo contact added successfully: ",
            JSON.stringify(data)
          );
        },
        function (error) {
          console.error("Error adding contact to Brevo:", error);
        }
      );
    } catch (emailError) {
      console.error("Error sending email or adding to Brevo:", emailError);
      // Don't fail the request if email fails, contact is already saved
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error("Error processing contact:", error);

    // Handle duplicate email error
    if (error.code === 11000 && error.keyPattern?.email) {
      return res
        .status(400)
        .json({ error: "This email is already registered." });
    }

    res.status(500).json({ error: "Error processing the request." });
  }
};

module.exports = { addcontact };
