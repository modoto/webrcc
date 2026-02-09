const express = require("express");
const router = express.Router();
const ctr = require("../controllers/MobileController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/operations", ctr.operations); // mobile
router.get("/detailsoperation/:id", ctr.detailsoperation); // mobile
router.get("/getMaps", ctr.getMaps); // mobile
router.get("/getMapGroups/:id", ctr.getMapGroups); // mobile
router.get("/getDevice/:id", ctr.getDevice); // mobile

module.exports = router;
