const Bwcam = require("../models/BwcamModel");
const db = require("../config/db");
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

  static async updateStatus(req, res) {
    const { id, status } = req.body;
    console.log('updateStatus');
    console.log('id:', id);
    console.log('status:', status);
    try {
      const query = `
      UPDATE bwcam SET 
        status=$1,
        updated_at=NOW()
      WHERE id=$2
    `;
      await db.query(query, [status, id]);
      res.json({ success: true, message: 'Status updated' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };

  static async delete(req, res) {
    await Bwcam.delete(req.params.id);
    res.redirect("/bwcam");
  }
}

module.exports = BwcamController;
