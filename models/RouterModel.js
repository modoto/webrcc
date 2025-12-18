const db = require("../config/db");

class RouterModel {
  static async getAll() {
    const q = "SELECT * FROM router WHERE deleted_at IS NULL ORDER BY id DESC";
    const result = await db.query(q);
    return result.rows;
  }

  static async getById(id) {
    const q = "SELECT * FROM router WHERE id = $1";
    const result = await db.query(q, [id]);
    return result.rows[0];
  }

  static async getReady() {
    const q = "SELECT id, router_id, device_name FROM router WHERE deleted_at IS NULL ORDER BY id DESC";
    const result = await db.query(q);
    return result.rows;
  }

  static async create(data) {
    const q = `
      INSERT INTO router 
      (router_id, device_name, model, item_no, serial_number, ip_address, mac_address, 
       power, username, password, status, created_at, updated_at, last_updated_at, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, NOW(), NOW(), NOW(), $12)
    `;

    const arr = [
        data.router_id,
        data.device_name,
        data.model,
        data.item_no,
        data.serial_number,
        data.ip_address,
        data.mac_address,
        data.power,
        data.username,
        data.password,
        data.status,
        data.user_id,
    ];

    const res = await db.query(q, arr);
    return res.rows[0];
  }

  static async update(id, data) {
    const q = `
      UPDATE router SET 
      router_id=$1, device_name=$2, model=$3, item_no=$4, serial_number=$5,
      ip_address=$6, mac_address=$7, power=$8, username=$9, password=$10,
      status=$11, updated_at=NOW(), last_updated_at=NOW(), user_id=$12
      WHERE id=$13
    `;

    const arr = [
      data.router_id,
        data.device_name,
        data.model,
        data.item_no,
        data.serial_number,
        data.ip_address,
        data.mac_address,
        data.power,
        data.username,
        data.password,
        data.status,
        data.user_id, id
    ];

    return db.query(q, arr);
  }

  static async softDelete(id) {
    const q = `UPDATE router SET deleted_at = NOW() WHERE id=$1`;
    return db.query(q, [id]);
  }
}

module.exports = RouterModel;
