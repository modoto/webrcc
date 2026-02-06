const express = require("express");
const router = express.Router();
const GpsController = require("../controllers/GpsController");
const { requireLogin, authMiddleware } = require("../helpers/sessionHelper");

router.get("/", requireLogin, authMiddleware, GpsController.index);
router.get("/getMaps", requireLogin, GpsController.getMaps);
router.get("/getMapGroups/:id", requireLogin, GpsController.getMapGroups);
router.get("/getDevice/:id", requireLogin, GpsController.getDevice);

router.post("/create", requireLogin, authMiddleware, GpsController.create);

module.exports = router; 