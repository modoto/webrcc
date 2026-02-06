const Tablet = require("../models/TabletModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class TabletController {
  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Tablet.getAll();
    res.render("tablet/index", {
      title: "Tablet List",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      rows
    });
  }

  static async createForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    res.render("tablet/create", {
      title: "Add Tablet",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles
    });
  }

  static async create(req, res) {

    await Tablet.create(req.body);
    res.redirect("/tablet");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Tablet.getById(req.params.id);
    res.render("tablet/edit", {
      title: "Edit Tablet",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      row
    });
  }

  static async update(req, res) {
    await Tablet.update(req.params.id, req.body);
    res.redirect("/tablet");
  }

  static async delete(req, res) {

    await Tablet.delete(req.params.id);
    res.redirect("/tablet");
  }
}

module.exports = TabletController;
