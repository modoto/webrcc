const express = require("express");
const router = express.Router();
const GpsController = require("../controllers/GpsController");
const { authMiddleware } = require("../helpers/sessionHelper");

router.get("/", authMiddleware, GpsController.index);
router.get("/getMaps", GpsController.getMaps);
router.get("/getMapGroups/:id", GpsController.getMapGroups);
router.get("/getDevice/:id", GpsController.getDevice);

router.post("/create", authMiddleware, GpsController.create);

module.exports = router; 