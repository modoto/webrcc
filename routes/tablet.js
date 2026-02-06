const express = require("express");
const router = express.Router();
const TabletController = require("../controllers/TabletController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, TabletController.index);

router.get("/create", requireLogin, TabletController.createForm);
router.post("/create", requireLogin, TabletController.create);

router.get("/edit/:id", requireLogin, TabletController.editForm);
router.post("/edit/:id", requireLogin, TabletController.update);

router.get("/delete/:id", requireLogin, TabletController.delete);

module.exports = router;
