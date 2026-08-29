const ApiError = require("../utils/ApiError");

// Validates req[property] (body/params/query) against a Joi schema and
// replaces it with the sanitized value, or forwards a 400 ApiError.
const validate = (schema, property = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new ApiError(400, "Validation failed", details));
  }

  req[property] = value;
  next();
};

module.exports = validate;
