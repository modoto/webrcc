const GpsModel = require("../models/GpsModel");
const { authMiddleware } = require("../helpers/sessionHelper");

class BwcamController {
    static async index(req, res) {
        try {
            const rows = await GpsModel.getAll();
            res.json({ code: 200, status: true, message: 'Success', data: rows });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async getMaps(req, res) {
        try {
            const result = await GpsModel.getMaps();
            const markers = result.map(row => ({
                    coords: [row.latitute, row.longitude],
                    popup: `📍 ${row.device_id}`
                }));

            res.json({ code: 200, status: true, message: 'Success', data: markers });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async getMapGroups(req, res) {
        try {
            const result = await GpsModel.getMapGroups(req.params.id);
            const markers = result.map(row => ({
                    coords: [row.latitute, row.longitude],
                    popup: `📍 ${row.driver}`
                }));

            res.json({ code: 200, status: true, message: 'Success', data: markers });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async device(req, res) {
        try {
            const rows = await GpsModel.getByDeviceId(req.params.id);
            res.json({ code: 200, status: true, message: 'success', data: rows });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async create(req, res) {
        const { device_id, latlon } = req.body;
        try {
            nonExistentFunction();
        } catch (error) {
            console.error(error);
        }
        var arr = latlon.split(",");
        const data = {
            device_id,
            latlon,
            latitute: arr[0],
            longitude: arr[1]
        }
        await GpsModel.create(data);
        res.json({ code: 200, status: true, data: data });
    }
}

module.exports = BwcamController;