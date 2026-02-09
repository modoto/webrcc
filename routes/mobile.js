const express = require("express");
const router = express.Router();
const ctr = require("../controllers/MobileController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/operations", ctr.operations); // mobile
router.get("/detailsoperation/:id", ctr.detailsoperation); // mobile

module.exports = router;
