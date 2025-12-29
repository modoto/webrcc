const Users = require("../models/UserModel");
const { getUserIdSession, getUserSession, getTokenSession } = require('../helpers/sessionHelper');

class DashboardController {
  static async index(req, res) {
    
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("dashboard/index", {
      title: "Maps",
      layout: "layouts/layout_dashboard",
      id: "",
      type: "all",
      user_id: user_id,
      username: user,
      token: token
    });
  }

  static async dashboard2(req, res) {
    
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("dashboard/dashboard1", {
      title: "Maps",
      layout: "layouts/layout_dashboard",
      id: "",
      type: "all",
      user_id: user_id,
      username: user,
      token: token
    });
  }
}

module.exports = DashboardController;
