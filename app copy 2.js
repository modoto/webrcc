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
const { requireLogin, requireRole, requireRoles } = require('./helpers/sessionHelper');

// ====================================================
//  EXPRESS INITIALIZATION
// ====================================================

const IP_ADDRESS = process.env.SERVER_ADDRESS;
const JWT_SECRET = process.env.JWT_SECRET;
const SOCKET_URL = process.env.SOCKET_URL;

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json()); // parsing JSON
app.use(bodyParser.urlencoded({ extended: true })); // parsing form data

// ====================================================
//  SESSION
// ====================================================
app.use(session({
  secret: "rahasia",
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 30 }
}));

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
//  SOCKET.IO SETUP
// ====================================================
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem'),
};

//const server = http.createServer(app);
const server = https.createServer(options, app);
const io = new Server(server, { cors: { origin: "*" } });

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
  console.log("Connected:", socket.id, " user:", userId);

  // Mark user online
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  io.emit("user_online", { userId });

  // -------- join conversation chat room --------
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

    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = getOrCreateRoom(roomId, getRouter());
    room.peers.delete(socket.id);

    socket.to(`call_${roomId}`).emit("peer_left", { peerId: socket.id });
  });


  // =======================
  // CALL SIGNALING (2)
  // =======================
  socket.on("call_user", ({ roomId, targetUserId }) => {
    // Server menerima sinyal dan membuat nama room baru dari parameter roomId yang di kirim dari caller
    // Contoh roomName = call_2
    const roomName = `call_${roomId}`;
    // Caller join ke room call_2
    socket.join(roomName);

    // server mengirim sinyal ke target user yang sedang online dengan parameter roomid, userid Caller dan userid Calle
    // Contoh : roomId = 2, fromUserId = 1, toUserId = 10
    io.to([...onlineUsers.get(targetUserId) || []]).emit("incoming_call", {
      roomId,
      fromUserId: socket.userId,
      toUserId: targetUserId
    });
  });

  // =======================
  // ACCEPT CALL (4)
  // =======================
  socket.on("accept_call", ({ roomId }) => {
    // Server menerima sinyal dan membuat nama room baru dari parameter roomId yang di kirim dari calle
    // Contoh roomName = call_2
    const roomName = `call_${roomId}`;
    // Calle join ke room call_2
    socket.join(roomName);

    // server mengirim sinyal ke Caller bahwa target (calle) sudah menerima panggilan
    // Contoh roomId = 2 acceptedBy : 10
    io.to(roomName).emit("call_accepted", {
      roomId,
      acceptedBy: socket.userId
    });
  });

  // =======================
  // REJECT CALL (10)
  // =======================
  socket.on("reject_call", ({ roomId, fromUserId }) => {
    io.to([...onlineUsers.get(fromUserId) || []]).emit("call_rejected", { roomId, rejectedBy: socket.userId });
  });

  socket.on("reject_group_call", ({ roomId, fromUserId }) => {
    io.to([...onlineUsers.get(fromUserId) || []]).emit("group_call_rejected", {
      roomId,
      rejectedBy: socket.userId
    });
  });

  // =======================
  // CANCEL CALL (Caller end before accepted)
  // =======================
  socket.on("cancel_call", ({ roomId, targetUserId }) => {
    console.log("📴 Call canceled by caller:", socket.userId);

    // Kirim ke callee yang sedang berdering
    io.to([...onlineUsers.get(targetUserId) || []]).emit("call_canceled", {
      roomId,
      canceledBy: socket.userId
    });
  });

  // =======================
  // END CALL
  // =======================
  socket.on("end_call", () => {
    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    //console.log('room sebelum delete -->', room)
    room.peers.delete(socket.id);
    console.log('end_call')
    //console.log('room sesudah delete-->', room)

    socket.to(`call_${socket.data.roomId}`).emit("call_ended", { peerId: socket.id });

    //untuk groups
    socket.to(`call_${socket.data.roomId}`).emit("peer_left", {
      peerId: socket.id
    });
  });

  // =======================
  // MEDIASOUP
  // Event ini dipanggil oleh Caller & Callee setelah call diterima.
  // Fungsinya: mendaftarkan socket ke room mediasoup.
  // =======================

  // =======================
  // GROUPS CALL
  // =======================
  socket.on("start_group_call", ({ roomId, participantIds }) => {
    console.log("📞 start_group_call", roomId, participantIds);

    socket.join(`call_${roomId}`);

    (participantIds || []).forEach(uid => {
      const sockets = onlineUsers.get(uid);
      if (!sockets) return;

      sockets.forEach(socketId => {
        io.to(socketId).emit("incoming_group_call", {
          roomId,
          fromUserId: socket.userId
        });
      });
    });
  });

  // END GROUPS CALL

  socket.on("join_call", async ({ roomId }) => {
    // Socket masuk ke Socket.IO room
    // Dipakai untuk:
    // broadcast ke semua peserta call
    // bukan mediasoup, tapi signaling
    socket.join(`call_${roomId}`);

    // Ambil room mediasoup berdasarkan roomId
    // Kalau belum ada → buat baru
    // getRouter() = mediasoup router (codec support, RTP caps)
    // 1 room = 1 router
    const room = getOrCreateRoom(roomId, getRouter());

    // Setiap participant disimpan sebagai peer
    room.peers.set(socket.id, {
      socket,                     // Key = socket.id (peerId) Simpan reference socket peer Digunakan untuk: emit event spesifik ke peer dan cleanup saat disconnect
      transports: new Map(),      // Key: transport.id Map semua transport peer Biasanya: 1 send transport dan 1 recv transport
      producers: new Map(),       // Key: producer.id Menyimpan semua producer milik peer ini Contoh: audio producer, video producer
      consumers: new Map()        // Menyimpan semua consumer peer ini Biasanya: consume audio peer lain dan consume video peer lain
    });

    // Simpan roomId di socket Supaya: gampang cleanup dan tahu peer ini ada di room mana
    socket.data.roomId = roomId;

    // 🧠 KRUSIAL
    // Kirim capability router ke client
    // Client butuh ini untuk: device.load({ routerRtpCapabilities }) Tanpa ini → mediasoup tidak bisa jalan
    socket.emit("router_rtp_capabilities", room.router.rtpCapabilities);

    // Array untuk menyimpan producer yang SUDAH ADA
    // Digunakan agar peer baru bisa langsung dengar audio yang sedang aktif.
    const existingProducers = [];

    // Loop semua peer yang sudah ada di room Termasuk: peer lama / peer baru (tapi belum punya producer)
    for (const [peerSocketId, peer] of room.peers.entries()) {
      // Loop semua producer milik peer tersebut Contoh: audio mic dari peer lama
      for (const producer of peer.producers.values()) {
        // Simpan info producer ke array
        existingProducers.push({
          producerId: producer.id,  // ID producer Dipakai client untuk: consumeAudio(producerId)
          peerId: peerSocketId      // ID peer pemilik producer Dipakai client untuk: hindari consume diri sendiri if (peerId === myPeerId) return;
        });
      }
    }

    // INI KUNCI A ↔ B TERHUBUNG
    // Kirim semua producer yang sudah aktif
    // Peer baru langsung consume audio lama
    // Tanpa ini → peer baru tidak dengar apa-apa
    socket.emit("existing_producers", existingProducers);

    // untuk groups
    io.to(`call_${roomId}`).emit("peer_joined", {
      peerId: socket.id,
      userId: socket.userId,
      name: socket.userId // atau username dari DB
    });
  });

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

  async function createWebRtcTransport(router) {
    return await router.createWebRtcTransport({
      listenIps: [{
        ip: "0.0.0.0",
        announcedIp: IP_ADDRESS // IP server kamu
      }],
      initialAvailableOutgoingBitrate: 1000000,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    });
  }

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

  socket.on("connect_transport", async ({ transportId, dtlsParameters }, cb) => {
    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = peer.transports.get(transportId);
    await transport.connect({ dtlsParameters });

    cb && cb();
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters }, cb) => {
    console.log("🎤 PRODUCE FROM", socket.id, "kind:", kind);

    const room = getOrCreateRoom(socket.data.roomId, getRouter());
    const peer = room.peers.get(socket.id);

    const transport = peer.transports.get(transportId);
    const producer = await transport.produce({ kind, rtpParameters, appData: { mediaTag: "audio" } });

    console.log("✅ PRODUCER ID:", producer.id);

    peer.producers.set(producer.id, producer);

    socket.to(`call_${socket.data.roomId}`).emit("new_producer", {
      producerId: producer.id,
      peerId: socket.id
    });

    cb({ id: producer.id });
  });

  socket.on("consume", async ({ roomId, producerId, rtpCapabilities }, cb) => {
    const room = getOrCreateRoom(roomId, getRouter());
    const peer = room.peers.get(socket.id);

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



  // =======================
  // PRODUCER MUTE / UNMUTE
  // =======================
  socket.on("producer_mute", ({ muted }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    const room = getOrCreateRoom(roomId, getRouter());
    const peer = room.peers.get(socket.id);
    if (!peer) return;

    for (const producer of peer.producers.values()) {
      if (muted) {
        producer.pause();
      } else {
        producer.resume();
      }
    }

    socket.to(`call_${roomId}`).emit("peer_muted", {
      peerId: socket.id,
      muted
    });
  });

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