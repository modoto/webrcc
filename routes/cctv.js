const express = require("express");
const router = express.Router();
const CctvController = require("../controllers/CctvController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, CctvController.index);


module.exports = router;
