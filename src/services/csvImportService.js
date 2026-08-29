const { parse } = require("csv-parse/sync");
const ApiError = require("../utils/ApiError");
const { createProductSchema } = require("../validators/productValidators");

const REQUIRED_COLUMNS = ["name", "unit_price"];

// Parses a products CSV (columns: name, description, category, unit_price,
// stock_quantity, image_url) into validated product objects ready for
// productService.bulkCreateProducts. Row-level errors are collected rather
// than aborting the whole import.
function parseProductsCsv(buffer) {
  let records;
  try {
    records = parse(buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err) {
    throw new ApiError(400, `Could not parse CSV: ${err.message}`);
  }

  if (!records.length) throw new ApiError(400, "CSV file has no data rows");

  const columns = Object.keys(records[0]);
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length) {
    throw new ApiError(400, `CSV is missing required column(s): ${missing.join(", ")}`);
  }

  const valid = [];
  const errors = [];
  records.forEach((record, i) => {
    const { error, value } = createProductSchema.validate(
      {
        name: record.name,
        description: record.description || undefined,
        category: record.category || undefined,
        unit_price: record.unit_price ? Number(record.unit_price) : undefined,
        stock_quantity: record.stock_quantity ? Number(record.stock_quantity) : undefined,
        image_url: record.image_url || undefined,
      },
      { abortEarly: false, stripUnknown: true }
    );
    if (error) {
      errors.push({ row: i + 2, error: error.details.map((d) => d.message).join("; ") });
    } else {
      valid.push(value);
    }
  });

  return { valid, errors };
}

module.exports = { parseProductsCsv };
