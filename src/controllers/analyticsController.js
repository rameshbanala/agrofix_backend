const asyncHandler = require("../utils/asyncHandler");
const analyticsService = require("../services/analyticsService");

const summary = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSummary();
  res.json(data);
});

module.exports = { summary };
