const db = require("../config/db");

class TabletModel {
  static async getAll() {
    const result = await db.query(
      "SELECT * FROM tablet WHERE deleted_at IS NULL ORDER BY id DESC"
    );
    return result.rows;
  }

  static async getById(id) {
    const result = await db.query("SELECT * FROM tablet WHERE id=$1", [id]);
    return result.rows[0];
  }

  static async getReady() {
    const result = await db.query(
      "SELECT id,tab_id, device_name FROM tablet WHERE deleted_at IS NULL ORDER BY id DESC"
    );
    return result.rows;
  }

  static async create(data) {
    const query = `
      INSERT INTO tablet (
        tab_id, device_name, model, item_no,
        serial_number, ip_address, mac_address, power,
        username, password,status, user_id
      ) VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `;
    await db.query(query, [
      data.tab_id, data.device_name, data.model, data.item_no,
      data.serial_number, data.ip_address, data.mac_address, data.power,
      data.username, data.password, data.status, data.user_id
    ]);
  }

  static async update(id, data) {
    const query = `
      UPDATE tablet SET 
        tab_id=$1, device_name=$2, model=$3, item_no=$4,
        serial_number=$5, ip_address=$6, mac_address=$7, power=$8,
        username=$9, password=$10,status=$11,
        updated_at=NOW(), user_id=$12
      WHERE id=$13
    `;
    await db.query(query, [
      data.tab_id, data.device_name, data.model, data.item_no,
      data.serial_number, data.ip_address, data.mac_address, data.power,
      data.username, data.password, data.status,
      data.user_id,
      id
    ]);
  }

  static async softDelete(id) {
    await db.query("UPDATE tablet SET deleted_at = NOW() WHERE id=$1", [id]);
  }
}

module.exports = TabletModel;