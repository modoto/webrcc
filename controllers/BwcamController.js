const Bwcam = require("../models/BwcamModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class BwcamController {
  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Bwcam.getAll();
    res.render("bwcam/index", {
      title: "Camera List",
      user_id: user_id,
      username: username,
      token: token,
      roles: roles,
      rows
    });
  }

  static async createForm(req, res) {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    res.render("bwcam/create", { 
      title: "Add Camera",
      user_id: user_id,
      username: username,
      token: token,
      roles: roles
    });
  }

  static async create(req, res) {
    await Bwcam.create(req.body);
    res.redirect("/bwcam");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const username = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Bwcam.findById(req.params.id);
    res.render("bwcam/edit", { 
      title: "Edit Camera", 
      user_id: user_id,
      username: username,
      token: token,
      roles: roles,
      row 
    });
  }

  static async update(req, res) {
    await Bwcam.update(req.params.id, req.body);
    res.redirect("/bwcam");
  }

  static async delete(req, res) {
    await Bwcam.delete(req.params.id);
    res.redirect("/bwcam");
  }
}

module.exports = BwcamController;
