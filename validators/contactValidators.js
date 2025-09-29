const { check } = require('express-validator');

const validateContact = [
  check('name').notEmpty().withMessage('Name is required'),
  check('prenom').notEmpty().withMessage('Prenom is required'),
  check('email').isEmail().withMessage('Valid email is required'),
  check('phoneNumber').notEmpty().withMessage('Phone number is required'),
  check('sujet').notEmpty().withMessage('Sujet is required'),
  check('message').notEmpty().withMessage('Message is required'),
  check('consent').isBoolean()
];

module.exports = validateContact;
