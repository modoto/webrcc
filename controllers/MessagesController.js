const pool = require('../config/db');

class MessagesController {
    static async listMessages(req, res) {
        const convId = Number(req.params.id);
        const limit = Number(req.query.limit || 20);
        const before = req.query.before;

        let sql = "SELECT m.*, u.username FROM messages m JOIN users u ON u.id=m.sender_id WHERE conversation_id=$1";
        const params = [convId];

        if (before) {
            sql += " AND m.created_at < $2";
            params.push(before);
        }

        sql += " ORDER BY m.created_at DESC LIMIT " + limit;

        const q = await pool.query(sql, params);
        res.json(q.rows);
    }

    static async saveMessage(req, res) {
        const conversationId = Number(req.params.conversationId);
        const senderId = Number(req.params.senderId);
        const content = Number(req.params.content);

        const q = await pool.query(
            `INSERT INTO messages (conversation_id, sender_id, content)
        VALUES ($1,$2,$3)
        RETURNING id, conversation_id, sender_id, content, created_at`,
            [conversationId, senderId, content]
        );
        return q.rows[0];
    }

    static async getMessages(req, res) {
        try {
            const userId = req.userId;
            const conversationId = Number(req.params.conversationId);
            const limit = Number(req.query.limit || 20);
            const before = req.query.before;

            // 1. Cek apakah user boleh akses conversation ini
            const check = await pool.query(
                `SELECT 1 FROM conversation_users
                WHERE conversation_id=$1 AND user_id=$2`,
                [conversationId, userId]
            );

            if (check.rows.length === 0) {
                return res.status(403).json({ error: "Tidak boleh akses conversation ini" });
            }

            // 2. Query messages
            let sql = `
            SELECT m.*, u.username 
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = $1
            `;
            const params = [conversationId];

            if (before) {
                sql += " AND m.created_at < $2";
                params.push(before);
            }

            sql += ` ORDER BY m.created_at DESC LIMIT ${limit}`;

            const q = await pool.query(sql, params);

            return res.json(q.rows);

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    }
}

module.exports = MessagesController;