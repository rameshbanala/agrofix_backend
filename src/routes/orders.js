const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const controller = require("../controllers/orderController");
const {
  createOrderSchema,
  updateStatusSchema,
  idParamSchema,
} = require("../validators/orderValidators");

router.post("/", authenticate, validate(createOrderSchema), controller.placeOrder);
router.get("/", authenticate, controller.listMyOrders);
router.get("/admin/orders", authenticate, authorizeAdmin, controller.listAllOrders);
router.get("/:id", authenticate, validate(idParamSchema, "params"), controller.getMyOrder);
router.put(
  "/:id/cancel",
  authenticate,
  validate(idParamSchema, "params"),
  controller.cancelMyOrder
);
router.put(
  "/:id/status",
  authenticate,
  authorizeAdmin,
  validate(idParamSchema, "params"),
  validate(updateStatusSchema),
  controller.updateStatus
);

module.exports = router;
