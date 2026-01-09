// ====================================================
//  IMPORT MODULE
// ====================================================
const express = require("express");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const http = require("http");
require('dotenv').config(); // Loads variables from .env file into process.env
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const pool = require('./config/db');

// ====================================================
//  EXPRESS INITIALIZATION
// ====================================================
const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json()); // parsing JSON
app.use(bodyParser.urlencoded({ extended: true })); // parsing form data
//app.use(express.urlencoded({ extended: true }));


// ====================================================
//  SESSION
// ====================================================
app.use(session({
  secret: "rahasia",
  resave: false,
  saveUninitialized: true
}));

// ====================================================
//  SOCKET.IO SETUP
// ====================================================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = process.env.JWT_SECRET;
const SOCKET_URL = process.env.SOCKET_URL;
console.log('SOCKET_URL:', SOCKET_URL);

// ===================== SOCKET AUTH ===================
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    //console.log("token:", token);
    if (!token) return next(new Error("Unauthorized"));

    // decode jwt
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId; // userId VALID
    next();

  } catch (err) {
    next(new Error("Invalid token"));
  }
});


// ====================================================
//  ONLINE USERS MEMORY STORE
// ====================================================
const onlineUsers = new Map(); // userId → Set(socketId)


// ====================================================
//  SOCKET.IO EVENTS
// ====================================================
io.on("connection", (socket) => {
  const userId = socket.userId;
  //console.log("Connected:", socket.id, " user:", userId);

  // Mark user online
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  io.emit("user_online", { userId });


  // -------- join conversation room --------
  socket.on("join_room", async (conversationId) => {
    console.log('join_room :', conversationId);
    socket.join(`conv_${conversationId}`);
  });


  // -------- typing indicator --------
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(`conv_${conversationId}`).emit("typing", { userId, isTyping });
  });


  // -------- SEND MESSAGE --------
  socket.on("send_message", async ({ conversationId, content }) => {
    console.log('send_message conversationId:', conversationId);
    console.log('send_message content:', content);
    if (!content || !conversationId) return;

    // SAVE MESSAGE INTO DATABASE
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, content, status)
       VALUES ($1, $2, $3, 'sent')
       RETURNING id, conversation_id, sender_id, content, created_at`,
      [conversationId, userId, content]
    );

    const saved = result.rows[0];

    // Tambahkan sender username
    const userQ = await pool.query("SELECT username FROM users WHERE id=$1", [userId]);
    saved.username = userQ.rows[0].username;

    //console.log('saved:', saved);

    // BROADCAST TO ROOM
    //io.to(`conv_${conversationId}`).emit("new_message", saved);
    // BROADCAST KE LAWAN CHAT
    socket.to(`conv_${conversationId}`).emit("new_message", {
      ...saved,
      status: "delivered"
    });
  });

  socket.on("message_read", async ({ conversationId }) => {
    const userId = socket.userId;

    await pool.query(
      `UPDATE messages 
     SET status='read'
     WHERE conversation_id=$1 AND sender_id != $2`,
      [conversationId, userId]
    );

    socket.to(`conv_${conversationId}`).emit("messages_read", { conversationId });
  });


  socket.on("message_delivered", async ({ messageId }) => {
    await pool.query(
      `UPDATE messages SET status='delivered' WHERE id=$1`,
      [messageId]
    );
  });


  // -------- disconnect --------
  socket.on("disconnect", () => {
    const set = onlineUsers.get(userId);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId });
      }
    }
  });
});


// ====================================================
//  VIEW ENGINE
// ====================================================
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");


// ====================================================
//  STATIC FILES
// ====================================================
app.use(express.static(path.join(__dirname, "public")));


// ====================================================
//  ROUTES
// ====================================================
app.use("/", require("./routes/auth"));
app.use("/dashboard", require("./routes/dashboard"));
app.use("/vehicle", require("./routes/vehicle"));
app.use("/router", require("./routes/router"));
app.use("/mtcam", require("./routes/mtcam"));
app.use("/bwcam", require("./routes/bwcam"));
app.use("/tablet", require("./routes/tablet"));
app.use("/unit", require("./routes/unit"));
app.use("/activity", require("./routes/activity"));
app.use("/users", require("./routes/users"));
app.use("/chat", require("./routes/chat"));
app.use("/cctv", require("./routes/cctv"));
app.use("/maps", require("./routes/maps"));
app.use("/conversations", require("./routes/conversations"));
app.use("/messages", require("./routes/messages"));
app.use("/gps", require("./routes/gps"));

// DASHBOARD PAGE
// app.get("/dashboard", (req, res) => {
//   res.render("dashboard/dashboard1", {
//     title: "RCC Dashboard",
//     layout: "layouts/layout_camera"
//   });
// });

app.use((req, res, next) => {
  res.locals.baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  next();
});



// ====================================================
//  SERVER RUN
// ====================================================
const port = 3001;
server.listen(port, () => {
  console.log("Server running at http://localhost:" + port);
});
