const Unit = require("../models/UnitModel");
const Vehicle = require("../models/VehicleModel");
const Bwcam = require("../models/BwcamModel");
const Mtcam = require("../models/MtcamModel");
const Tablet = require("../models/TabletModel");
const Router = require("../models/RouterModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class UnitController {
  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const rows = await Unit.getAll();

    res.render("unit/index", {
      title: "Unit List",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      rows
    });
  }

  static async details(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const unit = await Unit.getById(req.params.id);
    const vehicle = await Vehicle.findByCode(unit.vehicle_id);
    const bwcam = await Bwcam.findByCode(unit.bwcam_id);
    const mtcam = await Mtcam.findByCode(unit.mtcam_id);
    const tablet = await Tablet.findByCode(unit.tab_id);
    const router = await Router.findByCode(unit.router_id);
    res.render("unit/Details", {
      title: "Details Unit",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      unit,
      vehicle,
      bwcam,
      mtcam,
      tablet,
      router
    });
  }

  static async createForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const vehicle = await Vehicle.getAll();
    const bwcams = await Bwcam.getAll();
    const mtcams = await Mtcam.getReady();
    const tablet = await Tablet.getReady();
    const routers = await Router.getReady();
    res.render("unit/create", {
      title: "Add Unit",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      vehicle,
      bwcams,
      mtcams,
      tablet,
      routers
    });
  }

  static async create(req, res) {
    await Unit.create(req.body);
    res.redirect("/unit");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Unit.getById(req.params.id);
    const vehicle = await Vehicle.getAll();
    const bwcams = await Bwcam.getAll();
    const mtcams = await Mtcam.getReady();
    const tablet = await Tablet.getReady();
    const routers = await Router.getReady();
    res.render("unit/edit", {
      title: "Edit Unit",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      row,
      vehicle,
      bwcams,
      mtcams,
      tablet,
      routers
    });
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

