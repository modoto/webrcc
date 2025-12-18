const express = require("express");
const router = express.Router();
const TabletController = require("../controllers/TabletController");

router.get("/", TabletController.index);

router.get("/create", TabletController.createForm);
router.post("/create", TabletController.create);

router.get("/edit/:id", TabletController.editForm);
router.post("/edit/:id", TabletController.update);

router.get("/delete/:id", TabletController.delete);

module.exports = router;
