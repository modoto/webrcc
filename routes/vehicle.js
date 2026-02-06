const express = require("express");
const router = express.Router();
const VehicleController = require("../controllers/VehicleController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, VehicleController.index);
router.get("/create", requireLogin, VehicleController.createForm);
router.post("/create", requireLogin, VehicleController.create);
router.get("/edit/:id", requireLogin, VehicleController.editForm);
router.post("/edit/:id", requireLogin, VehicleController.update);
router.get("/delete/:id", requireLogin, VehicleController.delete);

module.exports = router;
