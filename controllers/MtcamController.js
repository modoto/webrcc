const Mtcam = require('../models/MtcamModel');

class MtcamController {
    static async index (req, res) {
        const result = await Mtcam.getAll();
        res.render('mtcam/index', { title: "Camera List", rows: result.rows });
    }

    static async createForm (req, res) {
        res.render('mtcam/create', { title: "Add Camera" });
    }

    static async create (req, res) {
        await Mtcam.create(req.body);
        res.redirect('/mtcam');
    }

    static async editForm (req, res) {
        const result = await Mtcam.getById(req.params.id);
        res.render('mtcam/edit', {  title: "Edit Camera", row: result.rows[0] });
    }

    static async update (req, res) {
        await Mtcam.update(req.params.id, req.body);
        res.redirect('/mtcam');
    }

    static async delete (req, res) {
        await Mtcam.softDelete(req.params.id);
        res.redirect('/mtcam');
    }
}

module.exports = MtcamController;

