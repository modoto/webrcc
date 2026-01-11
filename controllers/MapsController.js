const Users = require("../models/UserModel");
const Unit = require("../models/UnitModel");
const { getUserIdSession, getUserSession, getTokenSession } = require('../helpers/sessionHelper');

class MapsController {
  static async index(req, res) {
    const units = await Unit.getAll();
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("maps/index", {
      title: "Maps",
      layout: "layouts/layout_maps",
      id: "",
      type: "all",
      user_id: user_id,
      username: user,
      token: token,
      units: units
    });
  }

  static async details(req, res) {
    const id = req.params.id
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("maps/index", {
      title: "Maps",
      layout: "layouts/layout_maps",
      id: id,
      type: "individu",
      user_id: user_id,
      username: user,
      token: token
    });
  }

  static async groups(req, res) {
    const id = req.params.id
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    console.log(user_id);
    res.render("maps/index", {
      title: "Maps",
      layout: "layouts/layout_maps",
      id: id,
      type: "groups",
      user_id: user_id,
      username: user,
      token: token
    });
  }



}

module.exports = MapsController;
