const express = require("express");
const router = express.Router();

const { authenticate, authorizeAdmin } = require("../middleware/auth");
const controller = require("../controllers/analyticsController");

router.get("/summary", authenticate, authorizeAdmin, controller.summary);

module.exports = router;
