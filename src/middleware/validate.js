const ApiError = require("../utils/ApiError");

// Validates req[property] (body/params/query) against a Joi schema.
//
// Express 5's req.query is a live getter recomputed from the raw URL on
// every access (no stable backing object), so assigning req.query = value
// silently does nothing — the coerced/defaulted values would be lost and
// controllers would keep reading raw strings. To keep the coerced value
// usable, query validation results are stored on req.validatedQuery instead;
// body/params remain plain writable properties and are reassigned as usual.
const validate = (schema, property = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message);
    return next(new ApiError(400, "Validation failed", details));
  }

  if (property === "query") {
    req.validatedQuery = value;
  } else {
    req[property] = value;
  }
  next();
};

module.exports = validate;
