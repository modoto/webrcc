const express = require("express");
const router = express.Router();
const BwcamController = require("../controllers/BwcamController");

router.get("/", BwcamController.index);

router.get("/create", BwcamController.createForm);
router.post("/create", BwcamController.create);

router.get("/edit/:id", BwcamController.editForm);
router.post("/edit/:id", BwcamController.update);

router.get("/delete/:id", BwcamController.delete);

module.exports = router;
