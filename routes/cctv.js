const express = require("express");
const router = express.Router();
const CctvController = require("../controllers/CctvController");

router.get("/", CctvController.index);


module.exports = router;
