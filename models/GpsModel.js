const db = require("../config/db");
const { DateTime } = require('luxon');

class GpsModel {
    static async getAll() {
        const result = await db.query(
            "SELECT device_id, latlon, latitute, longitude, to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at FROM gps"
        );
        return result.rows;
    }

    static async getMaps() {
        const result = await db.query(
            "SELECT id, device_id, latitute, longitude FROM gps"
        );
        return result.rows;
    }

    static async getMapGroups(id) {
        const result = await db.query(
            "SELECT da.id, unit_id, driver, g.latitute, g.longitude FROM dt_activity da LEFT JOIN gps g on g.device_id=da.unit_id WHERE da.activity_id=$1",
            [id]
        );
        return result.rows;
    }


    static async getByDeviceId(id) {
        const result = await db.query("SELECT id, device_id, latlon, latitute, longitude, to_char(created_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as created_at FROM gps WHERE device_id=$1", [id]);
        return result.rows;
    }

    static async create(data) {
        const jakartaNow = DateTime.now().setZone('Asia/Jakarta');
        const dateNow = jakartaNow.toFormat('yyyy-MM-dd HH:mm:ss'); 

        const result = await db.query("SELECT * FROM gps WHERE device_id=$1", [data.device_id]);

        if (result.rows.length > 0) {
            const gps = result.rows[0];
            const query = `UPDATE gps SET latlon = $1, latitute = $2, longitude = $3, created_at = $4 WHERE device_id = $5`;
            await db.query(query, [
                data.latlon, data.latitute, data.longitude, dateNow, data.device_id
            ]);
        } else {
            const query = `
                INSERT INTO gps (
                    device_id, latlon, latitute, longitude, created_at
                ) VALUES
                ($1,$2,$3,$4,$5)
                `;
            await db.query(query, [
                data.device_id, data.latlon, data.latitute, data.longitude, dateNow
            ]);
        }

    }
}

module.exports = GpsModel;
