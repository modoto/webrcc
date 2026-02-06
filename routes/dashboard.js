const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, DashboardController.index);
router.get('/dashboard2', requireLogin, DashboardController.dashboard2);

module.exports = router;
