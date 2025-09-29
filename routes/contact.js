
const express = require("express");
const router = express.Router();
const { addcontact } = require("../controllers/add_contact.js");
const { contactget } = require("../controllers/get_contact.js");
const { deleteContact } = require("../controllers/deleteContact.js"); // Make sure this path is correct
const validateContact = require("../validators/contactValidators.js");

// These routes will be prefixed with /api/contact from app.js
router.post("/", validateContact, addcontact);
router.get("/", contactget);
router.delete("/:id", deleteContact); // Make sure this matches the frontend request URL

module.exports = router;