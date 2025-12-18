const express = require("express");
const router = express.Router();
const RouterController = require("../controllers/RouterController");

router.get("/", RouterController.index);

router.get("/create", RouterController.createForm);
router.post("/create", RouterController.create);

router.get("/edit/:id", RouterController.editForm);
router.post("/edit/:id", RouterController.update);

router.get("/delete/:id", RouterController.delete);

module.exports = router;
