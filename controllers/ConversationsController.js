const pool = require('../config/db');

class ConversationsController {
    static async createConversation(req, res) {
        const { name, isGroup, members } = req.body;

        const conv = await pool.query(
            "INSERT INTO conversations (name, is_group) VALUES ($1,$2) RETURNING *",
            [name, isGroup]
        );

        const convId = conv.rows[0].id;

        // insert members
        for (let uid of members) {
            await pool.query(
                "INSERT INTO conversation_users (conversation_id, user_id) VALUES ($1,$2)",
                [convId, uid]
            );
        }

        res.json(conv.rows[0]);
    }

    static async myConversations(req, res) {
        const q = await pool.query(
            `SELECT c.*
                FROM conversations c
                JOIN conversation_users cu ON cu.conversation_id=c.id
                WHERE cu.user_id=$1`,
            [req.userId]
        );

        res.json(q.rows);
    }

    static async findOrCreateConversation1(req, res) {
        console.log('findOrCreateConversation');
        try {
            const userId = req.userId;
            const targetUserId = Number(req.params.targetUserId);
            console.log('userId :', userId);
            console.log('targetUserId :', targetUserId);

            const q = "SELECT * FROM conversations WHERE id = $1";
            const result = await pool.query(q, [targetUserId]);
            const conversation = result.rows[0];

            if (result.rows.length > 0) {
                const conversation_id = conversation.id;
                const is_group = conversation.is_group;
                console.log('conversation_id :', conversation_id);
                console.log('is_group :', is_group);

                if (is_group == true) {
                    return res.json({ targetUserId });
                }
            }

            console.log('Check User');
            const q1 = "SELECT * FROM users WHERE id = $1";
            const result1 = await pool.query(q1, [userId]);
            const user_from = result1.rows[0];
            console.log('user_from :', user_from);

            const q2 = "SELECT * FROM users WHERE id = $1";
            const result2 = await pool.query(q2, [targetUserId]);
            const user_to = result2.rows[0];
            console.log('user_to :', user_to);

            const name = user_from.username + ' - ' + user_to.username;
            console.log('conversation name:', name);

            console.log('userId:', userId);
            console.log('targetUserId:', targetUserId);
            // 1) Cari conversation yg berisi KEDUA user
            const check = await pool.query(
                `SELECT cu.conversation_id,cs.is_group
                FROM conversation_users cu
                JOIN conversations cs
                ON cu.conversation_id=cs.id
                WHERE cu.user_id IN ($1, $2) AND cs.is_group = false
                GROUP BY cu.conversation_id,cs.is_group
                HAVING COUNT(*) = 2
                `,
                [userId, targetUserId]
            );

            console.log('check conversation');
            let conversationId;
            if (check.rows.length > 0) {
                console.log('conversation id sudah ada');
                conversationId = check.rows[0].conversation_id;
                const isGroup = check.rows[0].is_group;
                console.log('is group =', isGroup);
                if (isGroup == false) {
                    return res.json({ conversationId });
                }
            }

            // 2) Jika tidak ada → buat conversation baru
            console.log('buat conversation baru');
            const newConv = await pool.query(
                `INSERT INTO conversations (name, is_group)
                VALUES ($1, false)
                RETURNING id`,
                [name]
            );

            conversationId = newConv.rows[0].id;

            // 3) Tambahkan dua user
            await pool.query(
                `
            INSERT INTO conversation_users (conversation_id, user_id)
            VALUES 
            ($1, $2),
            ($1, $3)
            `,
                [conversationId, userId, targetUserId]
            );

            res.json({ conversationId });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    }

    static async findOrCreateConversation(req, res) {
        try {
            const userId = Number(req.userId);
            const targetUserId = Number(req.params.targetUserId);

            if (!userId || !targetUserId || userId === targetUserId) {
                return res.status(400).json({ error: "Invalid user" });
            }

            // 1️⃣ Cari private conversation yang SUDAH ADA
            const existing = await pool.query(
                `
            SELECT c.id
            FROM conversations c
            JOIN conversation_users cu1 ON cu1.conversation_id = c.id
            JOIN conversation_users cu2 ON cu2.conversation_id = c.id
            WHERE c.is_group = false
                AND cu1.user_id = $1
                AND cu2.user_id = $2
            LIMIT 1
            `,
                [userId, targetUserId]
            );

            if (existing.rows.length > 0) {
                return res.json({ conversationId: existing.rows[0].id });
            }

            // 2️⃣ Buat conversation baru (private)
            const conv = await pool.query(
                `
            INSERT INTO conversations (is_group)
            VALUES (false)
            RETURNING id
            `
            );

            const conversationId = conv.rows[0].id;

            // 3️⃣ Insert anggota conversation
            await pool.query(
                `
            INSERT INTO conversation_users (conversation_id, user_id)
            VALUES ($1, $2), ($1, $3)
            `,
                [conversationId, userId, targetUserId]
            );

            res.json({ conversationId });

        } catch (err) {
            console.error("findOrCreateConversation error:", err);
            res.status(500).json({ error: "Server error" });
        }
    }


    static async createGroup1(req, res) {
        try {
            const creatorId = req.userId;
            const { name, avatar, members } = req.body;

            if (!name || !members || members.length === 0) {
                return res.status(400).json({ error: "Name & members required" });
            }

            // 1) Buat conversation group
            const newConv = await pool.query(
                `INSERT INTO conversations (name, avatar, is_group)
                VALUES ($1, $2, true)
                RETURNING id`,
                [name, avatar || null]
            );

            const conversationId = newConv.rows[0].id;

            // 2) Tambahkan creator + members
            const allMembers = [creatorId, ...members];

            const values = allMembers
                .map((uid, i) => `($1, $${i + 2})`)
                .join(",");

            await pool.query(
                `INSERT INTO conversation_users (conversation_id, user_id)
                VALUES ${values}`,
                [conversationId, ...allMembers]
            );

            res.json({
                conversationId,
                message: "Group created successfully"
            });

        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server error" });
        }
    }

    // POST /groups
    static async createGroup(req, res) {
        console.log('createGroup');
        try {
            const userId = req.userId;
            const { name, avatar, memberIds } = req.body;

            console.log('total member', memberIds.length);
            if (!name || memberIds.length < 2) {
                return res.status(400).json({ error: "Minimal 3 anggota (termasuk kamu)" });
            }

            console.log('INSERT INTO conversations');
            const conv = await pool.query(
                `INSERT INTO conversations (name, avatar, is_group)
                    VALUES ($1, $2, true)
                    RETURNING id`,
                [name, avatar || null]
            );

            const conversationId = conv.rows[0].id;

            const members = [...new Set([userId, ...memberIds])];

            console.log('members :', members);
            for (const uid of members) {
                await pool.query(
                    `INSERT INTO conversation_users (conversation_id, user_id, role)
                    VALUES ($1, $2, $3)`,
                    [conversationId, uid, uid === userId ? 'admin' : 'member']
                );
            }

            res.json({ conversationId });

        } catch (err) {
            res.status(500).json({ error: "Server error" });
        }
    }

    static async renameGroup(req, res) {
        const userId = req.userId;
        const { conversationId } = req.params;
        const { name } = req.body;

        // cek admin
        const check = await pool.query(
            `SELECT role FROM conversation_users
            WHERE conversation_id=$1 AND user_id=$2`,
            [conversationId, userId]
        );

        if (check.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: "Only admin allowed" });
        }

        await pool.query(
            `UPDATE conversations SET name=$1 WHERE id=$2`,
            [name, conversationId]
        );

        res.json({ success: true });
    }

    static async addMember(req, res) {
        const userId = req.userId;
        const { conversationId } = req.params;
        const { memberId } = req.body;

        // cek admin
        const adminCheck = await pool.query(
            `SELECT role FROM conversation_users
     WHERE conversation_id=$1 AND user_id=$2`,
            [conversationId, userId]
        );

        if (adminCheck.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: "Only admin allowed" });
        }

        // cegah duplikat
        const exists = await pool.query(
            `SELECT 1 FROM conversation_users
     WHERE conversation_id=$1 AND user_id=$2`,
            [conversationId, memberId]
        );

        if (exists.rows.length > 0) {
            return res.status(400).json({ error: "User already in group" });
        }

        await pool.query(
            `INSERT INTO conversation_users (conversation_id, user_id, role)
     VALUES ($1, $2, 'member')`,
            [conversationId, memberId]
        );

        res.json({ success: true });
    }

    static async removeMember(req, res) {
        const userId = req.userId;
        const { conversationId, memberId } = req.params;

        // admin check
        const adminCheck = await pool.query(
            `SELECT role FROM conversation_users
     WHERE conversation_id=$1 AND user_id=$2`,
            [conversationId, userId]
        );

        if (adminCheck.rows[0]?.role !== 'admin') {
            return res.status(403).json({ error: "Only admin allowed" });
        }

        await pool.query(
            `DELETE FROM conversation_users
     WHERE conversation_id=$1 AND user_id=$2`,
            [conversationId, memberId]
        );

        res.json({ success: true });
    }


    static async ParticipantIds(req, res) {
        //const { conversationId, callerId } = req.body;
        const conversationId = req.body.conversationId;
        const callerId  = Number(req.body.callerId);
        //console.log(conversationId);
        // cek admin
        const q = await pool.query(
            `SELECT user_id, role FROM conversation_users
            WHERE conversation_id=$1 AND  user_id !=$2`,
            [conversationId, callerId]
        );

        const participants = q.rows;
        //console.log(participants);
        res.json({ success: true, participantIds : participants });
    }

    static async getUserConversations1(req, res) {
        try {
            const userId = req.userId;
            console.log('getUserConversations');
            console.log('userId:', userId);

            const q = await pool.query(`
            SELECT id, '' as name, 'false' as is_group, username as display_name,
                'https://ui-avatars.com/api/?name=' || username AS display_avatar,'' as last_message,
                '' as last_time, '0' as unread_count
                FROM users WHERE id != $1;
            `, [userId]);

            res.json(q.rows);

        } catch (err) {
            console.log(err);
            res.status(500).json({ error: "Server error" });
        }
    }

    static async getUserConversations2(req, res) {
        try {
            const userId = req.userId;
            console.log('getUserConversations');
            console.log('userId:', userId);

            const q = await pool.query(`
            SELECT 
            c.id,
            c.name,
            c.is_group,
            
            -- Display name (group or private)
            CASE 
                WHEN c.is_group = false THEN (
                SELECT u.username
                FROM conversation_users cu2
                JOIN users u ON u.id = cu2.user_id
                WHERE cu2.conversation_id = c.id AND cu2.user_id != $1
                LIMIT 1
                )
                ELSE c.name
            END AS display_name,

            -- Display avatar (always generate)
            CASE 
                WHEN c.is_group = false THEN (
                SELECT 'https://ui-avatars.com/api/?name=' || u.username
                FROM conversation_users cu2
                JOIN users u ON u.id = cu2.user_id
                WHERE cu2.conversation_id = c.id AND cu2.user_id != $1
                LIMIT 1
                )
                ELSE 'https://ui-avatars.com/api/?name=' || c.name
            END AS display_avatar,

            -- last message
            (
                SELECT content FROM messages m 
                WHERE m.conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) AS last_message,

            -- last message time
            (
                SELECT created_at FROM messages m 
                WHERE m.conversation_id = c.id
                ORDER BY created_at DESC
                LIMIT 1
            ) AS last_time,

            (
                SELECT COUNT(*) 
                FROM messages m
                WHERE m.conversation_id = c.id
                  AND m.sender_id != 1
                  AND m.status != 'read'
            ) AS unread_count

            FROM conversations c
            JOIN conversation_users cu ON cu.conversation_id = c.id
            WHERE cu.user_id = $1
            ORDER BY created_at DESC NULLS LAST;

            `, [userId]);

            res.json(q.rows);

        } catch (err) {
            console.log(err);
            res.status(500).json({ error: "Server error" });
        }
    }

    static async getUserConversations(req, res) {
        try {
            const userId = req.userId;
            console.log('getUserConversations');
            console.log('userId ok:', userId);

            const q = await pool.query(`
            WITH user_conversations AS (
                SELECT DISTINCT ON (c.id)
                    CASE 
                    WHEN c.is_group = false THEN u2.id
                    ELSE NULL
                    END AS id,
                    c.id AS conversation_id,
                    c.is_group,

                    CASE 
                    WHEN c.is_group = false THEN u2.username
                    ELSE c.name
                    END AS display_name,

                    CASE 
                    WHEN c.is_group = false THEN 
                        'https://ui-avatars.com/api/?name=' || u2.username
                    ELSE 
                        'https://ui-avatars.com/api/?name=' || c.name
                    END AS display_avatar,

                    (
                    SELECT content
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY created_at DESC
                    LIMIT 1
                    ) AS last_message,

                    (
                    SELECT created_at
                    FROM messages m
                    WHERE m.conversation_id = c.id
                    ORDER BY created_at DESC
                    LIMIT 1
                    ) AS last_time,

                    (
                    SELECT COUNT(*)
                    FROM messages m
                    WHERE m.conversation_id = c.id
                        AND m.sender_id != $1
                        AND m.status != 'read'
                    ) AS unread_count

                FROM conversations c
                JOIN conversation_users cu1
                    ON cu1.conversation_id = c.id
                    AND cu1.user_id = $1

                LEFT JOIN conversation_users cu2
                    ON c.is_group = false
                    AND cu2.conversation_id = c.id
                    AND cu2.user_id != $1

                LEFT JOIN users u2
                    ON u2.id = cu2.user_id

                ORDER BY c.id, last_time DESC NULLS LAST
                ),

                users_without_conversation AS (
                SELECT
                    u.id                id,
                    NULL::INTEGER        AS conversation_id,   -- 🔥 FIX
                    false               AS is_group,
                    u.username          AS display_name,
                    'https://ui-avatars.com/api/?name=' || u.username AS display_avatar,
                    NULL::TEXT          AS last_message,        -- 🔥 FIX
                    NULL::TIMESTAMP     AS last_time,           -- 🔥 FIX
                    0                   AS unread_count

                FROM users u
                WHERE u.id != $1
                    AND u.id NOT IN (
                    SELECT cu2.user_id
                    FROM conversation_users cu1
                    JOIN conversation_users cu2
                        ON cu1.conversation_id = cu2.conversation_id
                    WHERE cu1.user_id = $1 and cu2.user_id is not null
                    )
                )

                SELECT *
                FROM (
                SELECT * FROM user_conversations
                UNION ALL
                SELECT * FROM users_without_conversation
                ) t
                ORDER BY last_time DESC NULLS LAST;

            `, [userId]);

            res.json(q.rows);

        } catch (err) {
            console.log(err);
            res.status(500).json({ error: "Server error" });
        }
    }

}

module.exports = ConversationsController;