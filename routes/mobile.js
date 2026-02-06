const express = require("express");
const router = express.Router();
const ctr = require("../controllers/MobileController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/operations", requireLogin, ctr.operations); // mobile
router.get("/detailsoperation/:id", requireLogin, ctr.detailsoperation); // mobile

module.exports = router;
