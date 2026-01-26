const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

class UserModel {
  static async getAll() {
    const q = "SELECT * FROM users ORDER BY id ASC";
    const result = await db.query(q);
    return result.rows;
  }

  static async getById(id) {
    const q = "SELECT * FROM users WHERE id = $1";
    const result = await db.query(q, [id]);
    return result.rows[0];
  }

   static async getByNotMe(id) {
    const q = "SELECT * FROM users WHERE id != $1";
    const result = await db.query(q, [id]);
    return result.rows;
  }

  static async create(data) {
    const q = `
      INSERT INTO users (
        user_id, username, display_name, email, password, roles, status, created_at, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      RETURNING id
    `;

    const hash = await bcrypt.hash(data.password, 10);

    const arr = [
      data.user_id, data.username,  data.display_name, data.email,
      hash, data.roles, data.status, data.created_at
    ];

    const res = await db.query(q, arr);
    return res.rows[0];
  }

  static async update(id, data) {
    const q = `
      UPDATE users SET
        user_id=$1, username=$2, display_name=$3, email=$4, roles=$5, status=$6, updated_at=NOW(),
        last_updated_at=NOW(), created_by=$7
      WHERE id=$8
    `;

    const arr = [
      data.user_id, data.username, data.display_name, data.email, data.roles, data.status, data.created_by, id
    ];

    return db.query(q, arr);
  }

  static async softDelete(id) {
    const q = `UPDATE users SET deleted_at = NOW() WHERE id=$1`;
    return db.query(q, [id]);
  }
}

module.exports = UserModel;
