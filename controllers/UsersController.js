const Users = require("../models/UserModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class UsersController {
  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Users.getAll();
    res.render("users/index", {
      title: "Users List",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      rows
    });
  }

  static async getall(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Users.getAll();
    res.json(rows);
  }


  static async createForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    res.render("users/create", {
      title: "Add users",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles
    });
  }

  static async create(req, res) {
    await Users.create(req.body);
    res.redirect("/users");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Users.getById(req.params.id);
    res.render("users/edit", {
      title: "Edit users",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      row
    });
  }

  static async update(req, res) {
    await Users.update(req.params.id, req.body);
    res.redirect("/users");
  }

  static async changepassword(req, res) {
    const { password, confirm_password } = req.body;

    // Cek apakah password cocok
    if (password !== confirm_password) {
      // Jika tidak cocok, kirim alert sederhana atau redirect balik dengan pesan error
      return res.send("<script>alert('Password tidak cocok!'); window.history.back();</script>");
    }

    try {
      await Users.changepassword(req.params.id, req.body);
      res.redirect("/users");
    } catch (error) {
      console.error(error);
      res.status(500).send("Terjadi kesalahan server");
    }
  }


  static async delete(req, res) {

    await Users.softDelete(req.params.id);
    res.redirect("/users");
  }

  static async list(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    try {
      const rows = await Users.getAll();
      return res.json(rows);

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error" });
    }
  }
}

module.exports = UsersController;
