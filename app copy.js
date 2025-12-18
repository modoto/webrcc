const express = require("express");
const session = require('express-session');
const { setUserSession, getUserSession, clearUserSession, authMiddleware } = require('./helpers/sessionHelper');

const http = require("http");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

app.use(session({
  secret: 'rahasia',
  resave: false,
  saveUninitialized: true
}));

app.use(cors());
app.use(express.json());
const port = 3001;

const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// -------------- Socket.IO --------------
/*
 Socket middleware: validasi token saat connect 
 client harus connect dengan: io(url, { auth: { token } })
*/
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log('socket token:', token);
  if (!token) return next(new Error("No token"));
  socket.userId = token; // client kirim userId langsung, bebas
  next();
});


// Simpan online users in-memory (naive). Untuk produksi gunakan Redis.
const onlineUsers = new Map(); // userId -> Set of socketIds

io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log('id:', socket.id);
  console.log('userId:', socket.userId);
  // mark online
  if(!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // broadcast presence (could be to friends list only)
  io.emit("user_online", { userId });

  // join room API: room per conversation
  socket.on("join_room", async (conversationId) => {
    socket.join(`conv_${conversationId}`);
    // optional: notify other participants
  });

  socket.on("leave_room", (conversationId) => {
    socket.leave(`conv_${conversationId}`);
  });

  // typing indicator
  socket.on("typing", ({ conversationId, isTyping }) => {
    socket.to(`conv_${conversationId}`).emit("typing", { userId, isTyping });
  });

  // send message
  socket.on("send_message", async (payload) => {
    console.log('send_message : payload:', payload);
    // payload: { conversationId, content, fileUrl? }
    const { conversationId, senderId, username, content, fileUrl } = payload;
    //const senderId = socket.userId;
      // simpan ke DB
      const msg = await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
        VALUES ($1,$2,$3)
        RETURNING id, conversation_id, sender_id, content, created_at`,
        [conversationId, senderId, content]
      );

      const saved = msg.rows[0];

    // broadcast ke semua user dalam room
    io.to(`conv_${conversationId}`).emit("new_message", data);
  });

  socket.on("disconnect", () => {
    // remove socket id
    const s = onlineUsers.get(userId);
    if(s) {
      s.delete(socket.id);
      if(s.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId });
      }
    }
  });
});


// View engine
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Public folder
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));


// Routes

const authRoute = require("./routes/auth");
const vehicleRoute = require("./routes/vehicle");
const routerRoute = require('./routes/router');
const mtcamRoute = require('./routes/mtcam');
const bwcamRoutes = require("./routes/bwcam");
const tabletRoutes = require("./routes/tablet");
const unitRoutes = require("./routes/unit");
const activityRoutes = require("./routes/activity");
const chatRoutes = require("./routes/chat");
const usersRoutes = require("./routes/users");

const conversationsRoutes = require("./routes/conversations");
const messagesRoutes = require("./routes/messages");

app.use("/", authRoute);

app.get("/dashboard", (req, res) => {
    res.render("pages/dashboard", {
        title: "RCC Dashboard",
        layout: "layouts/camera"
    });
});

app.use("/vehicle", vehicleRoute);
app.use('/router', routerRoute);
app.use('/mtcam', mtcamRoute);
app.use("/bwcam", bwcamRoutes);
app.use("/tablet", tabletRoutes);
app.use("/unit", unitRoutes);
app.use("/activity", activityRoutes);
app.use("/users", usersRoutes);
app.use("/chat", chatRoutes);

app.use("/conversations", conversationsRoutes);
app.use("/messages", messagesRoutes);

app.get('/chat', (req, res) => {
    res.render("pages/chat", {
        title: "RCC Chat",
        layout: "layouts/chat"
    });
});

app.get('/maps', (req, res) => {
    res.render("pages/maps", {
        title: "RCC Map",
        layout: "layouts/map"
    });
});

// app.listen(port, () => {
//     console.log(`Server running at http://localhost:${port}`);
// });

server.listen(port, () => {
  console.log("Server running at 3001...");
});

// TRUNCATE TABLE hd_activity;
// ALTER SEQUENCE hd_activity_id_seq RESTART WITH 1;
    
// TRUNCATE TABLE dt_activity;
// ALTER SEQUENCE dt_activity_id_seq RESTART WITH 1;