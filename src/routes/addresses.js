const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const validate = require("../middleware/validate");
const controller = require("../controllers/addressController");
const { createAddressSchema, addressIdParamSchema } = require("../validators/addressValidators");

router.use(authenticate);

router.get("/", controller.list);
router.post("/", validate(createAddressSchema), controller.create);
router.delete("/:id", validate(addressIdParamSchema, "params"), controller.remove);
router.put("/:id/default", validate(addressIdParamSchema, "params"), controller.setDefault);

module.exports = router;
