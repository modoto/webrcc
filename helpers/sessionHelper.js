const jwt = require("jsonwebtoken");
require('dotenv').config(); // Loads variables from .env file into process.env

const JWT_SECRET = process.env.JWT_SECRET;

function setUserIdSession(req, user_id) {
    req.session.user_id = user_id;
}

function getUserIdSession(req) {
    return req.session.user_id;
}

function clearUserIdSession(req) {
    req.session.destroy();
}

function setUserSession(req, username) {
    req.session.username = username;
}

function getUserSession(req) {
    return req.session.username;
}

function clearUserSession(req) {
    req.session.destroy();
}

function setTokenSession(req, token) {
    req.session.token = token;
}

function getTokenSession(req) {
    return req.session.token;
}

function clearTokenSession(req) {
    req.session.destroy();
}

function setRolesSession(req, roles) {
    req.session.roles = roles;
}

function getRolesSession(req) {
    return req.session.roles;
}

function clearRosleSession(req) {
    req.session.destroy();
}



function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ code: 401, status: false, message: "Missing token" });

    const token = auth.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ code: 401, status: false, message: "Missing token" });
    }
}

// Middleware cek login
function requireLogin(req, res, next) {
    if (!req.session.user_id) {
        req.session.destroy();
        return res.redirect('/');
    }
    next();
}

// Middleware cek role
function requireRole(role) {
    return function (req, res, next) {
        if (!req.session.role) {
            req.session.destroy();
            return res.redirect('/');
        }
        if (req.session.user.role !== role) {
            return res.status(403).send('Access Denied');
        }
        next();
    }
}

// Middleware cek multiple role (opsional)
function requireRoles(roles = []) {
    return function (req, res, next) {
        if (!req.session.roles) {
            req.session.destroy();
            return res.redirect('/login');
        }
        if (!roles.includes(req.session.user.role)) {
            return res.status(403).send('Access Denied');
        }
        next();
    }
}


module.exports = {
    requireLogin,
    requireRole,
    requireRoles,
    setUserIdSession,
    getUserIdSession,
    clearUserIdSession,
    setUserSession,
    getUserSession,
    clearUserSession,
    setTokenSession,
    getTokenSession,
    clearTokenSession,
    authMiddleware,
    setRolesSession,
    getRolesSession,
    clearRosleSession
};