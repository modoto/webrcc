const pool = require('../config/db');

// HEADER (hd_activity)
exports.getAllHeader = async () => {
    const q = `SELECT hd.id, hd.activity_id, hd.activity_name,
            to_char(hd.start_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as start_date,
            to_char(hd.end_date AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as end_date,
            dt.personnel, hd.status FROM hd_activity hd
            left join (select activity_id, count(id) as personnel from dt_activity group by activity_id) dt
            on hd.activity_id = dt.activity_id 
            WHERE hd.deleted_at IS NULL ORDER BY id DESC`;
    const { rows } = await pool.query(q);
    return rows;
};

exports.getHeaderById = async (id) => {
    const q = `SELECT hda.*, cv.name as group_name FROM hd_activity hda INNER JOIN conversations cv ON CAST(hda.chat_id AS INTEGER)= cv.id WHERE hda.id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0];
};

exports.getHeaderByActivityId = async (id) => {
    const q = `SELECT * FROM hd_activity WHERE activity_id = $1 AND deleted_at IS NULL`;
     const { rows } = await pool.query(q, [id]);
    return rows;
};

exports.getHeaderOperationById = async (id) => {
    const q = `SELECT * FROM hd_activity WHERE id = $1 AND deleted_at IS NULL`;
     const { rows } = await pool.query(q, [id]);
    return rows;
};


exports.getDtOperationByActivityId = async (id) => {
    const q = `SELECT * FROM dt_activity WHERE activity_id = $1 AND deleted_at IS NULL`;
     const { rows } = await pool.query(q, [id]);
    return rows;
};


exports.getDetailsCamera = async (id) => {
    const q = `SELECT da.id, da.activity_id, da.unit_id, 
            u.mtcam_id , m.stream_url as ws_mtcam, 
            u.bwcam_id, b.stream_url as ws_bwcam  
            FROM dt_activity da 
            left join unit u on da.unit_id = u.unit_id 
            left join mtcam m  on u.mtcam_id  = m.mtcam_id 
            left join bwcam b  on u.bwcam_id   = b.bwcam_id WHERE da.activity_id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows;
};

exports.detailsoperation = async (id) => {
    const q = `SELECT da.id, da.activity_id, da.unit_id, 
            u.mtcam_id , m.stream_url as ws_mtcam, 
            u.bwcam_id, b.stream_url as ws_bwcam  
            FROM dt_activity da 
            left join unit u on da.unit_id = u.unit_id 
            left join mtcam m  on u.mtcam_id  = m.mtcam_id 
            left join bwcam b  on u.bwcam_id   = b.bwcam_id WHERE da.activity_id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows;
};

exports.createHeader = async (data) => {
    const activity_id = await generateRunningNumber();
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
        [conversationId, '1', 'admin']
    );

    const q = `
        INSERT INTO hd_activity (activity_id, activity_name, description, start_date, end_date, room_id, chat_id, status, user_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `;
    await pool.query(q, [
        activity_id,
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
        parseInt(data.status),
        data.user_id,
        id
    ]);

    const q2 = `UPDATE conversations SET name=$1 WHERE id=$2`;
    await pool.query(q2, [data.group_name,data.chat_id]);
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
        [data.chat_id, user_id, 'member']
    );
};

exports.deleteDetail = async (id) => {
    const q = `UPDATE dt_activity SET deleted_at = NOW() WHERE id = $1`;
    await pool.query(q, [id]);
};

async function generateRunningNumber() {
    let lastIdFromDb = "";
    // 1. Dapatkan tanggal hari ini (Format: YYMMDD)
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const currentDateStr = `${year}${month}${day}`; // Hasil: "260206"


    const q = `SELECT activity_id FROM hd_activity ORDER BY id DESC LIMIT 1`;
    const { rows } = await pool.query(q);

    // Cek apakah rows memiliki isi (tidak undefined dan panjangnya > 0)
    if (rows && rows.length > 0) {
        // Ambil activity_id dari baris pertama
        lastIdFromDb = rows[0].activity_id;
    } else {
        // Jika tabel kosong atau tidak ada data yang ditemukan
        lastIdFromDb = null;
    }

    const newPrefix = `${currentDateStr}`;

    // 2. Jika tidak ada data sebelumnya atau tanggal di database berbeda dengan hari ini
    if (!lastIdFromDb || !lastIdFromDb.includes(currentDateStr)) {
        return `${newPrefix}-001`;
    }

    // 3. Jika tanggal sama, ambil 4 digit terakhir dan tambahkan 1
    const parts = lastIdFromDb.split("-");
    const lastSequence = parseInt(parts[2], 10);
    const nextSequence = (lastSequence + 1).toString().padStart(3, '0');

    return `${newPrefix}-${nextSequence}`;
}