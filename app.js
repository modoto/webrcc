// ====================================================
//  IMPORT MODULE
// ====================================================
const express = require("express");
const fs = require('node:fs');
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
//const http = require("http");
const https = require('node:https');
require('dotenv').config(); // Loads variables from .env file into process.env
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const pool = require('./config/db');
const { initMediasoup, getRouter } = require("./mediasoupServer");
const { getOrCreateRoom } = require("./rooms");

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
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

//const server = http.createServer(app);
const server = https.createServer(options, app);


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
const transports = new Map(); // socket.id -> transport

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


  // =======================
  // CALL SIGNALING
  // =======================

  socket.on("call_user", ({ roomId, targetUserId }) => {
    const roomName = `call_${roomId}`;
    socket.join(roomName);

    io.to([...onlineUsers.get(targetUserId) || []]).emit("incoming_call", {
      roomId,
      fromUserId: socket.userId,
      toUserId: targetUserId
    });
  });

  socket.on("accept_call", ({ roomId }) => {
    const roomName = `call_${roomId}`;
    socket.join(roomName);

    io.to(roomName).emit("call_accepted", {
      roomId,
      acceptedBy: socket.userId
    });
  });

  socket.on("reject_call", ({ roomId, fromUserId }) => {
    io.to([...onlineUsers.get(fromUserId) || []]).emit("call_rejected", { roomId });
  });


  // =======================
  // MEDIASOUP
  // =======================

  socket.on("join_call", async ({ roomId }) => {
    socket.join(`call_${roomId}`);

    const room = getOrCreateRoom(roomId, getRouter());

    room.peers.set(socket.id, {
      socket,
      transports: new Map(),
      producers: new Map(),
      consumers: new Map()
    });

    socket.data.roomId = roomId;

    socket.emit("router_rtp_capabilities", room.router.rtpCapabilities);
  });

  async function createWebRtcTransport(router) {
    return await router.createWebRtcTransport({
      listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    });
  }

  socket.on("create_send_transport", async ({ roomId }, cb) => {
    const room = getOrCreateRoom(roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = await createWebRtcTransport(room.router);
    transport.appData = { direction: "send" };

    peer.transports.set(transport.id, transport);

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on("create_recv_transport", async ({ roomId }, cb) => {
    const room = getOrCreateRoom(roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = await createWebRtcTransport(room.router);
    transport.appData = { direction: "recv" };

    peer.transports.set(transport.id, transport);

    cb({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on("connect_transport", async ({ transportId, dtlsParameters }) => {
    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = peer.transports.get(transportId);
    await transport.connect({ dtlsParameters });
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters }, cb) => {
    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = peer.transports.get(transportId);
    const producer = await transport.produce({ kind, rtpParameters });

    peer.producers.set(producer.id, producer);

    socket.to(`call_${socket.data.roomId}`).emit("new_producer", {
      producerId: producer.id
    });

    cb({ id: producer.id });
  });

  socket.on("consume", async ({ roomId, producerId, rtpCapabilities }, cb) => {
    const room = getOrCreateRoom(roomId, getRouter());
    const peer = room.peers.get(socket.id);

    if (!room.router.canConsume({ producerId, rtpCapabilities })) {
      return cb({ error: "cannot consume" });
    }

    const transport = [...peer.transports.values()]
      .find(t => t.appData.direction === "recv");

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: false
    });

    peer.consumers.set(consumer.id, consumer);

    cb({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });

  socket.on("end_call", () => {
    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    room.peers.delete(socket.id);

    //socket.to(`call_${socket.data.roomId}`).emit("call_ended");
    socket.to(`call_${socket.data.roomId}`).emit("call_ended", { peerId: socket.id });
  });

  socket.on("disconnect", () => {
    console.log('disconnect');
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = getOrCreateRoom(roomId, getRouter());
    room.peers.delete(socket.id);

    socket.to(`call_${roomId}`).emit("peer_left", { peerId: socket.id });
  });


  // async function createWebRtcTransport(router) {
  //   return await router.createWebRtcTransport({
  //     listenIps: [{ ip: "0.0.0.0", announcedIp: null }],
  //     enableUdp: true,
  //     enableTcp: true,
  //     preferUdp: true
  //   });
  // }

  // function getTransportParams(t) {
  //   return {
  //     id: t.id,
  //     iceParameters: t.iceParameters,
  //     iceCandidates: t.iceCandidates,
  //     dtlsParameters: t.dtlsParameters
  //   };
  // }

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
app.use("/mobile", require("./routes/mobile"));

app.use((req, res, next) => {
  res.locals.baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  next();
});



// ====================================================
//  SERVER RUN
// ====================================================

(async () => {
  await initMediasoup();
  server.listen(3001, () =>
    console.log("🚀 Server running at https://localhost:3001")
  );
})();