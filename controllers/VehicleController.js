const Vehicle = require("../models/VehicleModel");
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class VehicleController {

  static async index(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const data = await Vehicle.getAll();
    res.render("vehicle/index", {
      title: "Vehicle List",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
      data
    });
  }

  static async createForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    res.render("vehicle/create", {
      title: "Add Vehicle",
      user_id: user_id,
      username: user,
      token: token,
      roles: roles,
    });
  }

  static async create(req, res) {
    console.log(req.body);
    await Vehicle.create(req.body);
    res.redirect("/vehicle");
  }

  static async editForm(req, res) {
    const user_id = getUserIdSession(req);
    const user = getUserSession(req);
    const token = getTokenSession(req);
    const roles = getRolesSession(req);

    const row = await Vehicle.getById(req.params.id);
    res.render("vehicle/edit", {
      title: "Edit Vehicle",
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
    await Vehicle.update(req.params.id, req.body);
    res.redirect("/vehicle");
  }

  static async delete(req, res) {

    await Vehicle.softDelete(req.params.id);
    res.redirect("/vehicle");
  }
}

module.exports = VehicleController;
