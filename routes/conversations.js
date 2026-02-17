//import { Router } from "express";

const express = require("express");
const router = express.Router();
const ConversationsController = require("../controllers/ConversationsController");
const { requireLogin, authMiddleware } = require("../helpers/sessionHelper");

router.get("/", ConversationsController.myConversations);
router.get("/getUserConversations", authMiddleware, ConversationsController.getUserConversations);
router.post("/ParticipantIds", authMiddleware, ConversationsController.ParticipantIds);
router.post("/", ConversationsController.createConversation);
router.post("/create-group", ConversationsController.createGroup);
router.get("/find-or-create/:targetUserId", authMiddleware, ConversationsController.findOrCreateConversation);

module.exports = router;