const Unit = require("../models/UnitModel");
const Vehicle = require("../models/VehicleModel");
const Bwcam = require("../models/BwcamModel");
const Mtcam = require("../models/MtcamModel");
const Tablet = require("../models/TabletModel");
const Router = require("../models/RouterModel");

class UnitController {
  static async index(req, res) {
    const rows = await Unit.getAll();
    res.render("unit/index", { title: "Unit List", rows });
  }

  static async createForm(req, res) {
    const vehicle = await Vehicle.getAll();
    const bwcams = await Bwcam.getAll();
    const mtcams = await Mtcam.getReady();
    const tablet = await Tablet.getReady();
    const routers = await Router.getReady();
    res.render("unit/create", { title: "Add Unit", vehicle, bwcams, mtcams, tablet, routers });
  }

  static async create(req, res) {
    await Unit.create(req.body);
    res.redirect("/unit");
  }

  static async editForm(req, res) {
    const row = await Unit.getById(req.params.id);
    const vehicle = await Vehicle.getAll();
    const bwcams = await Bwcam.getAll();
    const mtcams = await Mtcam.getReady();
    const tablet = await Tablet.getReady();
    const routers = await Router.getReady();
    res.render("unit/edit", { title: "Edit Unit", row, vehicle, bwcams, mtcams, tablet, routers });
  }

  static async update(req, res) {
    await Unit.update(req.params.id, req.body);
    res.redirect("/unit");
  }

  static async delete(req, res) {
    await Unit.delete(req.params.id);
    res.redirect("/unit");
  }
}

module.exports = UnitController;

