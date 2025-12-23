const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "rahasia_super_aman";

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



function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ code : 401, status: false, message : "Missing token" });

    const token = auth.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        return res.status(401).json({ code : 401, status: false, message : "Missing token" });
    }
}

module.exports = {
    setUserIdSession,
    getUserIdSession,
    clearUserIdSession,
    setUserSession,
    getUserSession,
    clearUserSession,
    setTokenSession,
    getTokenSession,
    clearTokenSession,
    authMiddleware
};