const Users = require("../models/UserModel");
const { getUserIdSession, getUserSession, getTokenSession } = require('../helpers/sessionHelper');


class CctvController {
  static async index(req, res) {
    
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const rows = await Users.getByNotMe(user_id);
    console.log(user_id);
    //console.log(rows);
    res.render("cctv/index", {
      title: "Chat List",
      layout: "layouts/layout_camera",
      user_id: user_id,
      username: user,
      token: token,
      rows: rows
    });
  }

}

module.exports = CctvController;
