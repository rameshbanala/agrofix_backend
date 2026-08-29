const Joi = require("joi");

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required(),
  description: Joi.string().trim().max(2000).allow("", null),
  unit_price: Joi.number().positive().precision(2).required(),
  stock_quantity: Joi.number().integer().min(0).default(0),
  image_url: Joi.string().trim().uri().allow("", null),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150),
  description: Joi.string().trim().max(2000).allow("", null),
  unit_price: Joi.number().positive().precision(2),
  stock_quantity: Joi.number().integer().min(0),
  image_url: Joi.string().trim().uri().allow("", null),
}).min(1);

const productIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
};
