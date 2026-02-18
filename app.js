// ====================================================
//  IMPORT MODULE
// ====================================================
const express = require("express");
const fs = require('node:fs');
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const http = require("http");
const https = require('node:https');
require('dotenv').config(); // Loads variables from .env file into process.env
const { Server } = require("socket.io");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const pool = require('./config/db');
const { createMediasoup } = require("./mediasoup");
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

let router;
const rooms = new Map(); // roomId -> { peers: Map }
(async () => {
  const media = await createMediasoup();
  router = media.router;
  console.log("Mediasoup ready 🚀");
})();

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { peers: new Map() });
  }
  return rooms.get(roomId);
}

function broadcastUsers(roomId) {
  const room = getRoom(roomId);

  const users = [];
  room.peers.forEach(peer => {
    users.push({
      id: peer.id,
      name: peer.username,
      speaking: false
    });
  });

  room.peers.forEach(peer => peer.emit("userList", users));
}

io.on("connection", (socket) => {
  socket.roomId = null;
  socket.username = null;
  socket.transports = new Map();
  socket.producers = new Map();
  socket.consumers = new Map();

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

    // await pool.query(
    //   `UPDATE messages 
    //  SET status='read'
    //  WHERE conversation_id=$1 AND sender_id != $2`,
    //   [conversationId, userId]
    // );

    socket.to(`conv_${conversationId}`).emit("messages_read", { conversationId });
  });

  socket.on("message_delivered", async ({ messageId }) => {
    await pool.query(
      `UPDATE messages SET status='delivered' WHERE id=$1`,
      [messageId]
    );
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
    console.log("targetUserId:", targetUserId);
    console.log("onlineUsers:", onlineUsers);

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

  socket.on("start_group_call", ({ roomId, participantIds }) => {
    console.log("📞 start_group_call", roomId, participantIds);
    const roomName = `call_${roomId}`;
    socket.join(roomName);

    (participantIds || []).forEach(targetUserId => {
      const sockets = onlineUsers.get(targetUserId);
      //console.log("uid:", targetUserId);
      //console.log("sockets:", sockets);
      if (!sockets) return;

      sockets.forEach(socketId => {
        //console.log("call to:", socketId);
        io.to([...onlineUsers.get(targetUserId) || []]).emit("incoming_call", {
          roomId,
          fromUserId: socket.userId,
          toUserId: targetUserId
        });
      });
    });
  });

  // =======================
  // REJECT CALL (10)
  // =======================
  socket.on("reject_call", ({ roomId, callerUserId }) => {

    console.log("📴 Call Rejected by:", socket.userId);
    io.to([...onlineUsers.get(callerUserId) || []]).emit("call_rejected", { roomId, rejectedBy: socket.userId });
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
  socket.on("end_call", ({ roomId }) => {
    console.log("📴 end_call from", socket.id);

    const room = getRoom(roomId);
    if (!room) return;

    // notify peers BEFORE cleanup
    room.peers.forEach(peer => {
      if (peer.id !== socket.id) {
        peer.emit("call_ended", {
          roomId,
          endedBy: socket.userId
        });
      }
    });

    // cleanup mediasoup
    closePeer(socket);

    // remove peer from room
    room.peers.delete(socket.id);

    // leave socket.io room
    socket.leave(`call_${roomId}`);

    broadcastUsers(roomId);
  });


  // =======================
  // MEDIASOUP
  // Event ini dipanggil oleh Caller & Callee setelah call diterima.
  // Fungsinya: mendaftarkan socket ke room mediasoup.
  // =======================

  socket.on("joinRoom", (roomId, callback) => {
    socket.roomId = roomId;
    socket.username = "User-" + socket.id.slice(0, 4);

    const room = getRoom(roomId);
    room.peers.set(socket.id, socket);

    broadcastUsers(roomId);

    callback(router.rtpCapabilities);
  });

  socket.on("createTransport", async callback => {
    const transport = await router.createWebRtcTransport({
      listenIps: [{
        ip: "0.0.0.0",
        announcedIp: "192.168.100.5" // IP server local
        //announcedIp: "192.168.18.94" // IP server local
        //announcedIp: "31.97.67.18" // IP server Public
        //announcedIp: IP_ADDRESS
      }],
      initialAvailableOutgoingBitrate: 1000000,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true
    });

    socket.transports.set(transport.id, transport);

    transport.on("close", () => {
      socket.transports.delete(transport.id);
    });

    callback({
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    });
  });

  socket.on("connectTransport", async ({ transportId, dtlsParameters }) => {
    const transport = socket.transports.get(transportId);
    if (transport && !transport.closed)
      await transport.connect({ dtlsParameters });
  });

  socket.on("produce", async ({ transportId, kind, rtpParameters }, callback) => {
    const transport = socket.transports.get(transportId);
    const producer = await transport.produce({ kind, rtpParameters });

    socket.producers.set(producer.id, producer);

    producer.on("close", () => {
      socket.producers.delete(producer.id);
    });

    const room = getRoom(socket.roomId);

    // notify peers
    room.peers.forEach(peer => {
      if (peer.id !== socket.id) {
        peer.emit("newProducer", {
          producerId: producer.id,
          peerId: socket.id
        });
      }
    });

    callback({ id: producer.id });
  });

  socket.on("consume", async ({ transportId, producerId, rtpCapabilities }, callback) => {
    const transport = socket.transports.get(transportId);

    if (!transport || transport.closed) return callback(null);

    if (!router.canConsume({ producerId, rtpCapabilities }))
      return callback(null);

    const consumer = await transport.consume({
      producerId,
      rtpCapabilities,
      paused: true
    });

     await consumer.resume();

    socket.consumers.set(consumer.id, consumer);

    consumer.on("close", () => {
      socket.consumers.delete(consumer.id);
    });

    callback({
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters
    });
  });

  socket.on("getProducers", callback => {
    const room = getRoom(socket.roomId);
    const ids = [];

    room.peers.forEach(peer => {
      peer.producers.forEach((_, id) => {
        if (peer.id !== socket.id) ids.push(id);
      });
    });

    callback(ids);
  });

  socket.on("speaking", isSpeaking => {
    const room = getRoom(socket.roomId);

    room.peers.forEach(peer => {
      peer.emit("userSpeaking", {
        id: socket.id,
        speaking: isSpeaking
      });
    });
  });

  function cleanup() {
    console.log("Peer left:", socket.id);

    const roomId = socket.roomId;
    const room = roomId ? getRoom(roomId) : null;

    // 🔥 notify others: producer closed
    if (room) {
      socket.producers.forEach((producer) => {
        room.peers.forEach(peer => {
          if (peer.id !== socket.id) {
            peer.emit("producerClosed", {
              producerId: producer.id,
              peerId: socket.id
            });
          }
        });
      });
    }

    socket.transports.forEach(t => t.close());
    socket.producers.forEach(p => p.close());

    socket.transports.clear();
    socket.producers.clear();

    if (room) {
      room.peers.delete(socket.id);
      broadcastUsers(roomId);
    }
  }


  socket.on("disconnect", () => {
    closePeer(socket);
  });
});

function closePeer(socket) {
  socket.transports.forEach(t => t.close());
  socket.producers.forEach(p => p.close());
  socket.consumers.forEach(c => c.close());

  socket.transports.clear();
  socket.producers.clear();
  socket.consumers.clear();
}


// ====================================================
//  SERVER RUN
// ====================================================
(async () => {
  await initMediasoup();
  server.listen(3001, () =>
    console.log("🚀 Server running at https://localhost:3001")
  );
})();