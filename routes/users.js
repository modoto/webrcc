const express = require("express");
const router = express.Router();
const UsersController = require("../controllers/UsersController");

router.get("/", UsersController.index);
router.get("/list", UsersController.list);
router.get("/getall", UsersController.getall);

router.get("/create", UsersController.createForm);
router.post("/create", UsersController.create);

router.get("/edit/:id", UsersController.editForm);
router.post("/edit/:id", UsersController.update);

router.get("/delete/:id", UsersController.delete);

module.exports = router;