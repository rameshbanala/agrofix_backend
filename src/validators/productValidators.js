const Joi = require("joi");

const priceTierSchema = Joi.object({
  min_quantity: Joi.number().integer().positive().required(),
  unit_price: Joi.number().positive().precision(2).required(),
});

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150).required(),
  description: Joi.string().trim().max(2000).allow("", null),
  category: Joi.string().trim().max(100).allow("", null),
  unit_price: Joi.number().positive().precision(2).required(),
  stock_quantity: Joi.number().integer().min(0).default(0),
  image_url: Joi.string().trim().uri().allow("", null),
  price_tiers: Joi.array().items(priceTierSchema).default([]),
});

const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(150),
  description: Joi.string().trim().max(2000).allow("", null),
  category: Joi.string().trim().max(100).allow("", null),
  unit_price: Joi.number().positive().precision(2),
  stock_quantity: Joi.number().integer().min(0),
  image_url: Joi.string().trim().uri().allow("", null),
  price_tiers: Joi.array().items(priceTierSchema),
}).min(1);

const productIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const listProductsQuerySchema = Joi.object({
  search: Joi.string().trim().max(150).allow(""),
  category: Joi.string().trim().max(100).allow(""),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().valid("newest", "price_asc", "price_desc", "name").default("newest"),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
};
