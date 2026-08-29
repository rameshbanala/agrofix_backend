const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { imageUpload, csvUpload } = require("../middleware/upload");
const controller = require("../controllers/productController");
const {
  createProductSchema,
  updateProductSchema,
  productIdParamSchema,
  listProductsQuerySchema,
} = require("../validators/productValidators");

router.get("/", validate(listProductsQuerySchema, "query"), controller.list);
router.get("/categories", controller.listCategories);

router.post(
  "/upload",
  authenticate,
  authorizeAdmin,
  imageUpload.single("image"),
  controller.uploadImage
);

router.post(
  "/import",
  authenticate,
  authorizeAdmin,
  csvUpload.single("file"),
  controller.importCsv
);

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
