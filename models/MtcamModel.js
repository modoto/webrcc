const db = require('../config/db');

class MtcamModel {
    static async getAll() {
        return db.query('SELECT * FROM mtcam WHERE deleted_at IS NULL ORDER BY id DESC');
    }

    static async getById(id) {
        return db.query('SELECT * FROM mtcam WHERE id = $1', [id]);
    }

    static async getReady() {
        const result = await db.query(
            "SELECT id, mtcam_id, device_name FROM mtcam WHERE deleted_at IS NULL ORDER BY id DESC"
        );
        return result.rows;
    }

    static async create(data) {
        const query = `
            INSERT INTO mtcam 
            (mtcam_id, device_name, model, item_no, serial_number, ip_address, mac_address, power,
             username, password, rtsp_url, rtsp_port, rtsp_username, rtsp_password,
             status, created_at, updated_at, user_id)
            VALUES 
            ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW(),$16)
        `;

        const values = [
            data.mtcam_id,
            data.device_name,
            data.model,
            data.item_no,
            data.serial_number,
            data.ip_address,
            data.mac_address,
            data.power,
            data.username,
            data.password,
            data.rtsp_url,
            data.rtsp_port,
            data.rtsp_username,
            data.rtsp_password,
            data.status,
            data.user_id
        ];

        return db.query(query, values);
    }

    static async update(id, data) {
        const query = `
            UPDATE mtcam SET
            mtcam_id=$1, device_name=$2, model=$3, item_no=$4, serial_number=$5,
            ip_address=$6, mac_address=$7, power=$8, username=$9, password=$10,
            rtsp_url=$11, rtsp_port=$12, rtsp_username=$13, rtsp_password=$14,
            status=$15, updated_at=NOW(), last_updated_at=NOW(), user_id=$16
            WHERE id=$17
        `;

        const values = [
            data.mtcam_id,
            data.device_name,
            data.model,
            data.item_no,
            data.serial_number,
            data.ip_address,
            data.mac_address,
            data.power,
            data.username,
            data.password,
            data.rtsp_url,
            data.rtsp_port,
            data.rtsp_username,
            data.rtsp_password,
            data.status,
            data.user_id,
            id
        ];

        return db.query(query, values);
    }

    static async softDelete(id) {
        return db.query(
            'UPDATE mtcam SET deleted_at = NOW() WHERE id = $1',
            [id]
        );
    }
}

module.exports = MtcamModel;
