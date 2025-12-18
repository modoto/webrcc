const express = require("express");
const router = express.Router();
const VehicleController = require("../controllers/VehicleController");

router.get("/", VehicleController.index);
router.get("/create", VehicleController.createForm);
router.post("/create", VehicleController.create);
router.get("/edit/:id", VehicleController.editForm);
router.post("/edit/:id", VehicleController.update);
router.get("/delete/:id", VehicleController.delete);

module.exports = router;
