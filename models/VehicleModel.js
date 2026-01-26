const db = require("../config/db");

class VehicleModel {
  static async getAll() {
    const q = "SELECT * FROM vehicle WHERE deleted_at IS NULL ORDER BY id ASC";
    const result = await db.query(q);
    return result.rows;
  }

  static async getById(id) {
    const q = "SELECT * FROM vehicle WHERE id = $1";
    const result = await db.query(q, [id]);
    return result.rows[0];
  }

   static async findByCode(id) {
        const result = await db.query("SELECT * FROM vehicle WHERE vehicle_id=$1", [id]);
        return result.rows[0];
    }

  static async create(data) {
    const q = `
      INSERT INTO vehicle (
        vehicle_id, police_number, brand, model, assembly_year,
        color, horse_power, chassis_number, machine_number, coding,
        bpkb_number, fuel, weight, volume_m3, status, created_at,
        user_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),$16)
      RETURNING id
    `;

    const arr = [
      data.vehicle_id, data.police_number, data.brand, data.model,
      data.assembly_year, data.color, data.horse_power, data.chassis_number,
      data.machine_number, data.coding, data.bpkb_number, data.fuel,
      data.weight, data.volume_m3, data.status, data.user_id
    ];

    const res = await db.query(q, arr);
    return res.rows[0];
  }

  static async update(id, data) {
    const q = `
      UPDATE vehicle SET
        vehicle_id=$1, police_number=$2, brand=$3, model=$4,
        assembly_year=$5, color=$6, horse_power=$7, chassis_number=$8,
        machine_number=$9, coding=$10, bpkb_number=$11, fuel=$12,
        weight=$13, volume_m3=$14, status=$15, updated_at=NOW(),
        last_updated_at=NOW(), user_id=$16
      WHERE id=$17
    `;

    const arr = [
      data.vehicle_id, data.police_number, data.brand, data.model,
      data.assembly_year, data.color, data.horse_power, data.chassis_number,
      data.machine_number, data.coding, data.bpkb_number, data.fuel,
      data.weight, data.volume_m3, data.status, data.user_id, id
    ];

    return db.query(q, arr);
  }

  static async softDelete(id) {
    const q = `UPDATE vehicle SET deleted_at = NOW() WHERE id=$1`;
    return db.query(q, [id]);
  }
}

module.exports = VehicleModel;
