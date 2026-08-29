const Joi = require("joi");

const orderItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
});

const createOrderSchema = Joi.object({
  delivery_address: Joi.string().trim().min(5).max(500).required(),
  items: Joi.array().items(orderItemSchema).min(1).required(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "in_progress", "delivered").required(),
});

const idParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = { createOrderSchema, updateStatusSchema, idParamSchema };
