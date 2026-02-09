require('dotenv').config(); // Loads variables from .env file into process.env
const pool = require('../config/db');
const Activity = require('../models/ActivityModel');
const GpsModel = require("../models/GpsModel");

const { getUserIdSession, getUserSession, getTokenSession, getRolesSession } = require('../helpers/sessionHelper');

class MobileController {
    static async operations(req, res) {
        try {
            const q = `SELECT hd.id, hd.activity_id, hd.activity_name, hd.description,
            to_char(hd.start_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as start_date,
            to_char(hd.end_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as end_date,
            dt.personnel, hd.status FROM hd_activity hd
            left join (select activity_id, count(id) as personnel from dt_activity group by activity_id) dt
            on hd.activity_id = dt.activity_id 
            WHERE hd.deleted_at IS NULL ORDER BY id DESC`;
            const { rows } = await pool.query(q);
            res.json({ code: 200, status: true, message: 'Success', data: rows });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async detailsoperation(req, res) {
        try {
            const SOCKET_URL = process.env.SOCKET_URL;

            const id = req.params.id;
            const hd_operation = await Activity.getHeaderOperationById(id);
            console.error(hd_operation[0].activity_id);
            const dt_operation = await Activity.getDtOperationByActivityId(hd_operation[0].activity_id);

            const user_id = getUserIdSession(req);
            const user = getUserSession(req);
            const token = getTokenSession(req);

            const data = {
                hd_operation,
                dt_operation
            }

            res.json({ code: 200, status: true, message: 'Success', data: data });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async getMaps(req, res) {
        try {
            const result = await GpsModel.getMaps();
            const rowSP = result[0];
            const startingPosition = [rowSP.latitute, rowSP.longitude];
            const markers = result.map(row => ({
                id: row.id,
                coords: [row.latitute, row.longitude],
                popup: `📍 ${row.device_id}`,
                is_online: true,
            }));

            res.json({ code: 200, status: true, message: 'Success', starting_position: startingPosition, data: markers });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async getMapGroups(req, res) {
        try {
            const result = await GpsModel.getMapGroups(req.params.id);
            const rowSP = result[0];
            const startingPosition = [rowSP.latitute, rowSP.longitude];
            const markers = result.map(row => ({
                id: row.id,
                coords: [row.latitute, row.longitude],
                unit_id: row.unit_id,
                driver: row.driver,
                popup: `📍 ${row.driver}`,
                is_online: true,
            }));

            res.json({ code: 200, status: true, message: 'Success', starting_position: startingPosition, data: markers });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

    static async getDevice(req, res) {

        try {
            const result = await GpsModel.getByDeviceId(req.params.id);
            const rowSP = result[0];
            const startingPosition = [rowSP.latitute, rowSP.longitude];
            const markers = result.map(row => ({
                id: row.id,
                coords: [row.latitute, row.longitude],
                popup: `📍 ${row.device_id}`,
                is_online: true,
            }));

            res.json({ code: 200, status: true, message: 'Success', starting_position: startingPosition, data: markers });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }

}

module.exports = MobileController;