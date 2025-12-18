const Users = require("../models/UserModel");

class UsersController {
  static async index(req, res) {
    const rows = await Users.getAll();
    res.render("users/index", { title: "Users List", rows });
  }

  static async getall(req, res) {
    const rows = await Users.getAll();
     res.json(rows);
  }


  static async createForm(req, res) {
    res.render("users/create", { title: "Add users" });
  }

  static async create(req, res) {
    await Users.create(req.body);
    res.redirect("/users");
  }

  static async editForm(req, res) {
    const row = await Users.getById(req.params.id);
    res.render("users/edit", { title: "Edit users", row });
  }

  static async update(req, res) {
    await Users.update(req.params.id, req.body);
    res.redirect("/users");
  }

  static async delete(req, res) {
    await Users.delete(req.params.id);
    res.redirect("/users");
  }

  static async list(req, res) {
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
