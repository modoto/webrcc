const Router = require("../models/RouterModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class RouterController {

  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Router.getAll();
    res.render("router/index", {
      title: "Router List",
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

    res.render("router/create", { 
      title: "Add Router" ,
      user_id: user_id,
      username: user,
      token: token,
      roles: roles
    });
  }

  static async create(req, res) {
    console.log(req.body);
    await Router.create(req.body);
    res.redirect("/router");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Router.getById(req.params.id);
    res.render("router/edit", {
      title: "Edit Router",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      row
    });
  }

  static async update(req, res) {
    console.log('Updateeeee');
    console.log(req.body);
    await Router.update(req.params.id, req.body);
    res.redirect("/router");
  }

  static async delete(req, res) {
    await Router.softDelete(req.params.id);
    res.redirect("/router");
  }
}

module.exports = RouterController;
