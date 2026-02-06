const express = require("express");
const router = express.Router();
const RouterController = require("../controllers/RouterController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, RouterController.index);

router.get("/create", requireLogin, RouterController.createForm);
router.post("/create", requireLogin, RouterController.create);

router.get("/edit/:id", requireLogin, RouterController.editForm);
router.post("/edit/:id", requireLogin, RouterController.update);

router.get("/delete/:id", requireLogin, RouterController.delete);

module.exports = router;
