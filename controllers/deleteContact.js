const Contact = require("../Models/contact.Model");

const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the ID is valid
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid contact ID format" });
    }
    
    const deletedContact = await Contact.findByIdAndDelete(id);
    
    if (!deletedContact) {
      return res.status(404).json({ message: "Contact not found" });
    }
    
    res.status(200).json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ message: "Error deleting contact" });
  }
};

module.exports = { deleteContact }