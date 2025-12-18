const Router = require("../models/RouterModel");

class RouterController {
  
  static async index(req, res) {
    const rows = await Router.getAll();
    res.render("router/index", { title: "Router List", rows });
  }

  static async createForm(req, res) {
    res.render("router/create", { title: "Add Router" });
  }

  static async create(req, res) {
    console.log(req.body);
    await Router.create(req.body);
    res.redirect("/router");
  }

  static async editForm(req, res) {
    const row = await Router.getById(req.params.id);
    res.render("router/edit", { title: "Edit Router", row });
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
