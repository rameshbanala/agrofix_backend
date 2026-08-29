const Joi = require("joi");

const createAddressSchema = Joi.object({
  label: Joi.string().trim().max(50).default("Address"),
  address_text: Joi.string().trim().min(5).max(500).required(),
  is_default: Joi.boolean().default(false),
});

const addressIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = { createAddressSchema, addressIdParamSchema };
