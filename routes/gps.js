const express = require("express");
const router = express.Router();
const GpsController = require("../controllers/GpsController");
const { authMiddleware } = require("../helpers/sessionHelper");

router.get("/", authMiddleware, GpsController.index);
router.get("/device/:id", authMiddleware, GpsController.device);

router.post("/create", authMiddleware, GpsController.create);

module.exports = router;