const express = require("express");
const router = express.Router();
const BwcamController = require("../controllers/BwcamController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, BwcamController.index);

router.get("/create", requireLogin, BwcamController.createForm);
router.post("/create", requireLogin, BwcamController.create);

router.get("/edit/:id", requireLogin, BwcamController.editForm);
router.post("/edit/:id", requireLogin, BwcamController.update);

router.get("/delete/:id", requireLogin, BwcamController.delete);

module.exports = router;
