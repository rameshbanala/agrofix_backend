const asyncHandler = require("../utils/asyncHandler");
const userService = require("../services/userService");

const list = asyncHandler(async (req, res) => {
  const users = await userService.listUsers();
  res.json(users);
});

const setRole = asyncHandler(async (req, res) => {
  const user = await userService.setUserRole(req.params.id, req.body.role, req.user.id);
  res.json(user);
});

module.exports = { list, setRole };
