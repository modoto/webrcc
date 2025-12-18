const Tablet = require("../models/TabletModel");

class TabletController {
  static async index (req, res) {
    const rows = await Tablet.getAll();
    res.render("tablet/index", { title: "Tablet List", rows });
  }

  static async createForm (req, res) {
    res.render("tablet/create", { title: "Add Tablet" });
  }

  static async create (req, res) {
    await Tablet.create(req.body);
    res.redirect("/tablet");
  }

  static async editForm (req, res) {
    const row = await Tablet.getById(req.params.id);
    res.render("tablet/edit", { title: "Edit Tablet", row });
  }

  static async update (req, res) {
    await Tablet.update(req.params.id, req.body);
    res.redirect("/tablet");
  }

  static async delete (req, res) {
    await Tablet.delete(req.params.id);
    res.redirect("/tablet");
  }
}

module.exports = TabletController;
