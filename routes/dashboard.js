const express = require("express");
const router = express.Router();
const DashboardController = require("../controllers/DashboardController");

router.get("/", DashboardController.index);
router.get('/dashboard2', DashboardController.dashboard2);

module.exports = router;
