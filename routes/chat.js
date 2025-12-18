const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");

router.get("/", ChatController.index);


module.exports = router;
