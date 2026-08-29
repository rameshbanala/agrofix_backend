const Joi = require("joi");

const setRoleSchema = Joi.object({
  role: Joi.string().valid("user", "admin").required(),
});

const userIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

module.exports = { setRoleSchema, userIdParamSchema };
