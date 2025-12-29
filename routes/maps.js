const express = require("express");
const router = express.Router();
const MapsController = require("../controllers/MapsController");

router.get("/", MapsController.index);
router.get('/groups/:id', MapsController.groups);

module.exports = router;
