const Bwcam = require("../models/BwcamModel");

class BwcamController {
  static async index (req, res) {
    const rows = await Bwcam.getAll();
    res.render("bwcam/index", { title: "Camera List", rows });
  }

  static async createForm (req, res) {
    res.render("bwcam/create", { title: "Add Camera" });
  }

  static async create (req, res) {
    await Bwcam.create(req.body);
    res.redirect("/bwcam");
  }

  static async editForm (req, res) {
    const row = await Bwcam.findById(req.params.id);
    res.render("bwcam/edit", { title: "Edit Camera", row });
  }

  static async update (req, res) {
    await Bwcam.update(req.params.id, req.body);
    res.redirect("/bwcam");
  }

  static async delete (req, res) {
    await Bwcam.delete(req.params.id);
    res.redirect("/bwcam");
  }
}

module.exports = BwcamController;
