const express = require("express");
const router = express.Router();
const UsersController = require("../controllers/UsersController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, UsersController.index);
router.get("/list", requireLogin, UsersController.list);
router.get("/getall", requireLogin, UsersController.getall);

router.get("/create", requireLogin, UsersController.createForm);
router.post("/create", requireLogin, UsersController.create);

router.get("/edit/:id", requireLogin, UsersController.editForm);
router.post("/edit/:id", requireLogin, UsersController.update);

router.get("/delete/:id", requireLogin, UsersController.delete);

module.exports = router;