const Mtcam = require('../models/MtcamModel');
const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class MtcamController {
    static async index(req, res) {
        const user_id = getUserIdSession(req);
        const user = getUserSession(req);
        const token = getTokenSession(req);
        const roles = getRolesSession(req);

        const result = await Mtcam.getAll();
        res.render('mtcam/index', {
            title: "Camera List",
            user_id: user_id,
            username: user,
            token: token,
            roles: roles,
            rows: result.rows
        });
    }

    static async createForm(req, res) {
        const user_id = getUserIdSession(req);
        const user = getUserSession(req);
        const token = getTokenSession(req);
        const roles = getRolesSession(req);

        res.render('mtcam/create', {
            title: "Add Camera",
            user_id: user_id,
            username: user,
            token: token,
            roles: roles
        });
    }

    static async create(req, res) {
        await Mtcam.create(req.body);
        res.redirect('/mtcam');
    }

    static async editForm(req, res) {
        const user_id = getUserIdSession(req);
        const user = getUserSession(req);
        const token = getTokenSession(req);
        const roles = getRolesSession(req);

        const result = await Mtcam.getById(req.params.id);
        res.render('mtcam/edit', {
            title: "Edit Camera",
            user_id: user_id,
            username: user,
            token: token,
            roles: roles,
            row: result.rows[0]
        });
    }

    static async update(req, res) {
        await Mtcam.update(req.params.id, req.body);
        res.redirect('/mtcam');
    }

    static async delete(req, res) {
        await Mtcam.softDelete(req.params.id);
        res.redirect('/mtcam');
    }
}

module.exports = MtcamController;

