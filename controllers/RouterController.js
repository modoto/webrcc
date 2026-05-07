const Router = require("../models/RouterModel");
const db = require("../config/db");
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

  static async updateStatus(req, res) {
    const { id, status } = req.body;
    try {
      await db.query(`UPDATE router SET status=$1, updated_at=NOW() WHERE id=$2`, [status, id]);
      res.json({ success: true, message: 'Status updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = RouterController;
