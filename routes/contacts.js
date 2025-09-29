const express = require("express");
const Contact = require("../Models/contact.Model");
const { addcontact } = require("../controllers/add_contact");

const router = express.Router();

// GET /api/contacts - Fetch all contacts
router.get("/", async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.status(200).json(contacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Error fetching contacts" });
  }
});

// POST /api/contacts - Add new contact (equivalent to post-contact)
router.post("/", addcontact);

// DELETE /api/contacts/:id - Delete a contact
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedContact = await Contact.findByIdAndDelete(id);

    if (!deletedContact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Error deleting contact" });
  }
});

module.exports = router;
