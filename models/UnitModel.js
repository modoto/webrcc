const db = require('../config/db');

class UnitModel {
  static async getAll() {
    const res = await db.query(
      "SELECT * FROM unit WHERE deleted_at IS NULL ORDER BY id DESC"
    );
    return res.rows;
  }

  static async getById(id) {
    const res = await db.query("SELECT * FROM unit WHERE id=$1", [id]);
    return res.rows[0];
  }

  static async create(data) {
    const query = `
      INSERT INTO unit (
        unit_id, vehicle_id, router_id, mtcam_id, bwcam_id, tab_id,
        status, user_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;
    await db.query(query, [
      data.unit_id, data.vehicle_id, data.router_id,
      data.mtcam_id, data.bwcam_id, data.tab_id,
      data.status, data.user_id
    ]);
  }

 static async update(id, data) {
    const query = `
      UPDATE unit SET
        unit_id=$1, vehicle_id=$2, router_id=$3, mtcam_id=$4, bwcam_id=$5, tab_id=$6,
        status=$7, updated_at=NOW(), user_id=$8
      WHERE id=$9
    `;
    await db.query(query, [
      data.unit_id, data.vehicle_id, data.router_id,
      data.mtcam_id, data.bwcam_id, data.tab_id,
      data.status, data.user_id,
      id
    ]);
  }

  static async softDelete(id) {
    await db.query("UPDATE unit SET deleted_at = NOW() WHERE id=$1", [id]);
  }
}

module.exports = UnitModel;
