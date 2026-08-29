const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const controller = require("../controllers/userController");
const { setRoleSchema, userIdParamSchema } = require("../validators/userValidators");

router.use(authenticate, authorizeAdmin);

router.get("/", controller.list);
router.put(
  "/:id/role",
  validate(userIdParamSchema, "params"),
  validate(setRoleSchema),
  controller.setRole
);

module.exports = router;
