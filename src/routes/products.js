const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const controller = require("../controllers/productController");
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
} = require("../validators/productValidators");

router.get("/", controller.list);

router.get(
  "/:id",
  authenticate,
  authorizeAdmin,
  validate(productIdParamSchema, "params"),
  controller.getOne
);

router.post("/", authenticate, authorizeAdmin, validate(createProductSchema), controller.create);

router.put(
  "/:id",
  authenticate,
  authorizeAdmin,
  validate(productIdParamSchema, "params"),
  validate(updateProductSchema),
  controller.update
);

router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  validate(productIdParamSchema, "params"),
  controller.remove
);

module.exports = router;
