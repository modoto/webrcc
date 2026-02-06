const express = require("express");
const router = express.Router();
const MapsController = require("../controllers/MapsController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, MapsController.index);
router.get('/groups/:id', requireLogin, MapsController.groups);

module.exports = router;
