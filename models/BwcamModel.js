const db = require("../config/db");

class BwcamModel {
  static async getAll() {
    const result = await db.query(
      "SELECT * FROM bwcam WHERE deleted_at IS NULL ORDER BY id DESC"
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await db.query("SELECT * FROM bwcam WHERE id=$1", [id]);
    return result.rows[0];
  }

  static async create(data) {
    const query = `
      INSERT INTO bwcam (
        bwcam_id, device_name, model, item_no,
        serial_number, ip_address, mac_address, power,
        username, password,
        rtsp_url, rtsp_port, rtsp_username, rtsp_password,
        stream_url, ffmpeg_options, max_retries, retry_delay, watchdog_timeout, watchdog_check_interval
        status, user_id
      ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
    `;
    await db.query(query, [
      data.bwcam_id, data.device_name, data.model, data.item_no,
      data.serial_number, data.ip_address, data.mac_address, data.power,
      data.username, data.password,
      data.rtsp_url, data.rtsp_port, data.rtsp_username, data.rtsp_password,
      data.rtsp_url, data.ffmpeg_options, data.max_retries, data.retry_delay, data.watchdog_timeout, data.watchdog_check_interval,
      data.status, data.user_id
    ]);
  }

  static async update(id, data) {
    const query = `
      UPDATE bwcam SET 
        bwcam_id=$1, device_name=$2, model=$3, item_no=$4,
        serial_number=$5, ip_address=$6, mac_address=$7, power=$8,
        username=$9, password=$10,
        rtsp_url=$11, rtsp_port=$12, rtsp_username=$13, rtsp_password=$14,
        stream_url=$15, ffmpeg_options=$16, max_retries=$17, retry_delay=$18, watchdog_timeout=$19, watchdog_check_interval=$20,
        status=$21,
        updated_at=NOW(), user_id=$22
      WHERE id=$23
    `;
    await db.query(query, [
      data.bwcam_id, data.device_name, data.model, data.item_no,
      data.serial_number, data.ip_address, data.mac_address, data.power,
      data.username, data.password,
      data.rtsp_url, data.rtsp_port, data.rtsp_username, data.rtsp_password,
      data.rtsp_url, JSON.stringify(data.ffmpeg_options), data.max_retries, data.retry_delay, data.watchdog_timeout, data.watchdog_check_interval,
      data.status,
      data.user_id,
      id
    ]);
  }

  static async delete(id) {
    await db.query("UPDATE bwcam SET deleted_at = NOW() WHERE id=$1", [id]);
  }
}

module.exports = BwcamModel;
