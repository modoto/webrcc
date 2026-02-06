require('dotenv').config(); // Loads variables from .env file into process.env
const Users = require("../models/UserModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');


class ChatController {
  static async index(req, res) {
    const SOCKET_URL = process.env.SOCKET_URL;

    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Users.getByNotMe(user_id);
    console.log(user_id);
    //console.log(rows);
    res.render("chat/index", {
      title: "Chat List",
      layout: "layouts/layout_chat",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      socket_url: SOCKET_URL,
      rows: rows
    });
  }
}

module.exports = ChatController;
