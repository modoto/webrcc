const pool = require('../config/db');
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const session = require('express-session');
const { 
    setUserIdSession, 
    setUserSession,
    setTokenSession,
} = require('../helpers/sessionHelper');


require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "secret";

class AuthController {

    static async index(req, res) {
        res.render("auth/login", {
            title: "Login",
            layout: "layouts/layout_login"
        });
    }

    static async register(req, res) {
        const { username, password, displayName } = req.body;

        const hash = await bcrypt.hash(password, 10);

        try {
            const q = await pool.query(
                "INSERT INTO users (username, password, display_name) VALUES ($1,$2,$3) RETURNING id, username",
                [username, hash, displayName]
            );
            res.json(q.rows[0]);
        } catch (e) {
            res.status(400).json({ error: "Username exists" });
        }
    }

    static async login(req, res) {
        console.log('AuthController:login');
        const { username, password } = req.body;
        console.log('username:', username);
        console.log('password:', password);

        const q = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
        const user = q.rows[0];
        //console.log('user:', user);

        if (!user) return res.status(401).json({ error: "Invalid login" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ error: "Invalid login" });

        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
        console.log('token:', token);
        console.log('------------------------');
        res.status(200).json({
            token,
            user: { id: user.id, username: user.username, displayName: user.display_name },
        });
    }

    static async create(req, res) {
        await Users.create(req.body);
        res.redirect("/users");
    }

    static async loginweb(req, res) {
        console.log('AuthController:loginweb');
        const { username, password } = req.body;
        console.log('username:', username);
        console.log('password:', password);

        const q = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
        const user = q.rows[0];
        console.log('user:', user);

        if (!user) {
            res.redirect("/");
        } else {
            const ok = await bcrypt.compare(password, user.password);
            if (!ok) {
                 res.redirect("/");
            } else {
                const JWT_SECRET = process.env.JWT_SECRET || "rahasia_super_aman";
                const token = jwt.sign({ userId: user.id }, JWT_SECRET);
                setUserIdSession(req, user.id);
                setUserSession(req, username);
                setTokenSession(req, token);
                

                console.log('token:', token);
                console.log('------------------------');
                res.redirect("/dashboard");
            }
        }

    }
}

module.exports = AuthController;