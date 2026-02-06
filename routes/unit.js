const express = require("express");
const router = express.Router();
const UnitController = require("../controllers/UnitController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, UnitController.index);
router.get("/details/:id", requireLogin, UnitController.details);

router.get("/create", requireLogin, UnitController.createForm);
router.post("/create", requireLogin,  UnitController.create);

router.get("/edit/:id", requireLogin, UnitController.editForm);
router.post("/edit/:id", requireLogin, UnitController.update);

router.get("/delete/:id", requireLogin, UnitController.delete);

module.exports = router;