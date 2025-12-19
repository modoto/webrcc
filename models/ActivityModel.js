const pool = require('../config/db');

// HEADER (hd_activity)
exports.getAllHeader = async () => {
    const q = `SELECT * FROM hd_activity WHERE deleted_at IS NULL ORDER BY id DESC`;
    const { rows } = await pool.query(q);
    return rows;
};

exports.getHeaderById = async (id) => {
    const q = `SELECT * FROM hd_activity WHERE id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0];
};

exports.createHeader = async (data) => {

    const conv = await pool.query(
        `INSERT INTO conversations (name, avatar, is_group)
                    VALUES ($1, $2, true)
                    RETURNING id`,
        [data.activity_name, null]
    );
    const conversationId = conv.rows[0].id;

    await pool.query(
        `INSERT INTO conversation_users (conversation_id, user_id, role)
                    VALUES ($1, $2, $3)`,
        [conversationId, '1','admin']
    );

    const q = `
        INSERT INTO hd_activity (activity_id, activity_name, description, start_date, end_date, room_id, chat_id, status, user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;
    await pool.query(q, [
        data.activity_id,
        data.activity_name,
        data.description,
        data.start_date,
        data.end_date,
        data.room_id,
        conversationId,
        data.status,
        data.user_id
    ]);
};

exports.updateHeader = async (id, data) => {

    const q = `
        UPDATE hd_activity SET
        activity_id=$1, activity_name=$2, description=$3, start_date=$4, end_date=$5,
        room_id=$6, chat_id=$7, status=$8, user_id=$9, updated_at=NOW()
        WHERE id=$10
    `;
    await pool.query(q, [
        data.activity_id,
        data.activity_name,
        data.description,
        data.start_date,
        data.end_date,
        data.room_id,
        data.chat_id,
        data.status,
        data.user_id,
        id
    ]);
};

exports.deleteHeader = async (id) => {
    const q = `UPDATE hd_activity SET deleted_at = NOW() WHERE id = $1`;
    await pool.query(q, [id]);
};

/////////////////////////////////////////////////////
// DETAIL (dt_activity)
//////////////////////////////////////////////////////

exports.getDetailByActivity = async (activity_id) => {
    const q = `SELECT * FROM dt_activity WHERE activity_id = $1 AND deleted_at IS NULL`;
    const { rows } = await pool.query(q, [activity_id]);
    return rows;
};

exports.addDetail = async (data) => {
    const q = `
        INSERT INTO dt_activity (activity_id, unit_id, nrp, driver, status, user_id)
        VALUES ($1,$2,$3,$4,$5,$6)
    `;
    await pool.query(q, [
        data.activity_id,
        data.unit_id,
        data.nrp,
        data.driver,
        data.status,
        data.user_id
    ]);

    const q2 = `SELECT * FROM users WHERE user_id = $1`;
    const { rows } = await pool.query(q2, [data.unit_id]);
    const user_id = rows[0].id;

     await pool.query(
        `INSERT INTO conversation_users (conversation_id, user_id, role)
                    VALUES ($1, $2, $3)`,
        [data.chat_id, user_id,'member']
    );
};

exports.deleteDetail = async (id) => {
    const q = `UPDATE dt_activity SET deleted_at = NOW() WHERE id = $1`;
    await pool.query(q, [id]);
};
