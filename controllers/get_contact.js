const Contact = require("../Models/contact.Model");

const contactget = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json(contacts);
  } catch (error) {
    console.error("Error retrieving contacts:", error);
    res.status(500).send("Error retrieving contacts");
  }
};

module.exports = { contactget };
