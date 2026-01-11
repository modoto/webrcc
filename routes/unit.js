const express = require("express");
const router = express.Router();
const UnitController = require("../controllers/UnitController");

router.get("/", UnitController.index);
router.get("/details/:id", UnitController.details);

router.get("/create", UnitController.createForm);
router.post("/create", UnitController.create);

router.get("/edit/:id", UnitController.editForm);
router.post("/edit/:id", UnitController.update);

router.get("/delete/:id", UnitController.delete);

module.exports = router;