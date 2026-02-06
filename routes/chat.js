const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/ChatController");
const { requireLogin } = require("../helpers/sessionHelper");

router.get("/", requireLogin, ChatController.index);


module.exports = router;
