
const express = require("express");
const router = express.Router();
const MessagesController = require("../controllers/MessagesController");
const { authMiddleware } = require("../helpers/sessionHelper");

router.get("/:id", MessagesController.listMessages);
router.post("/", MessagesController.saveMessage);
router.get("/:conversationId", authMiddleware, MessagesController.getMessages);

module.exports = router;
