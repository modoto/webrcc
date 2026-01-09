require('dotenv').config(); // Loads variables from .env file into process.env
const pool = require('../config/db');
const { getUserIdSession, getUserSession, getTokenSession } = require('../helpers/sessionHelper');

class MobileController {
    static async operations(req, res) {
        try {
            const q = `SELECT hd.id, hd.activity_id, hd.activity_name,
            to_char(hd.start_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as start_date,
            to_char(hd.end_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as end_date,
            dt.personnel, hd.status FROM hd_activity hd
            left join (select activity_id, count(id) as personnel from dt_activity group by activity_id) dt
            on hd.activity_id = dt.activity_id 
            WHERE hd.deleted_at IS NULL ORDER BY id DESC`;
            const { rows }  = await pool.query(q);
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
            const q = `SELECT * FROM hd_activity WHERE id = $1`;
            const { rows } = await pool.query(q, [id]);
            const hd_activity = rows[0];

            const q2 = `SELECT * FROM dt_activity WHERE activity_id = $1 AND deleted_at IS NULL`;
            const { rows2 } = await pool.query(q2, [hd_activity.activity_id]);
            const dt_activity = rows2;

            const user_id = getUserIdSession(req);
            const user = getUserSession(req);
            const token = getTokenSession(req);

            const data = {
                hd_activity: hd_activity,
                dt_activity: dt_activity,
            }

            res.json({ code: 200, status: true, message: 'Success', data: data });
        } catch (error) {
            console.error(error);
            res.json({ code: 500, status: false, message: error });
        }
    }


}

module.exports = MobileController;