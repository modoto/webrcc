const Vehicle = require("../models/VehicleModel");

class VehicleController {
  
  static async index(req, res) {
    const data = await Vehicle.getAll();
    res.render("vehicle/index", { title: "Vehicle List", data });
  }

  static async createForm(req, res) {
    res.render("vehicle/create", { title: "Add Vehicle" });
  }

  static async create(req, res) {
    console.log(req.body);
    await Vehicle.create(req.body);
    res.redirect("/vehicle");
  }

  static async editForm(req, res) {
    const row = await Vehicle.getById(req.params.id);
    res.render("vehicle/edit", { title: "Edit Vehicle", row });
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
