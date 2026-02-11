import * as mediasoupClient from "https://esm.sh/mediasoup-client@3";

const socket = io("/", {
  auth: { token }
});

let device;
let sendTransport;
let recvTransport;
let localTrack;
let currentRoomId = null;
let currentTargetUserId = null;

let deviceReady = false;
let recvReady = false;
let callConnected = false;
let callPending = false;

let mediasoupStarted = false;

let isMicActive = false;

const consumers = new Map();      // producerId -> consumer
const audioElements = new Map();  // producerId -> audio
const pendingProducers = new Set();

let micAnimationId = null;
let micStream;
let isMuted = false;
const peers = new Map();
// =======================
// START CALL (CALLER) (1)
// =======================
window.startCall = (roomId, targetUserId) => {
  console.log('START CALL (CALLER)');
  console.log(roomId);
  console.log(targetUserId);

  // Menampilkan Modal pada caller
  const modal = document.getElementById("callModal");
  modal.classList.remove("hidden");

  callPending = true;
  currentTargetUserId = targetUserId

  // Mengirim data ke server dengan parameter room id dan target user yang akan di panggil
  // contoh roomId = 2 dan targetUserId = 10
  currentRoomId = roomId;
  socket.emit("call_user", { roomId, targetUserId });
};

window.startGroupCall = (roomId, participantIds) => {
  console.log("📞 START GROUP CALL", roomId, participantIds);

  currentRoomId = roomId;

  // tampilkan UI call di host
  document.getElementById("callModal").classList.remove("hidden");

  // 🔥 INI YANG KAMU TANYA
  socket.emit("start_group_call", {
    roomId,
    participantIds // array userId
  });
};

// =======================
// INCOMING CALL (CALLE) (3)
// =======================
socket.on("incoming_call", ({ roomId, fromUserId, toUserId }) => {
  // Target atau Calle menerima sinyal yang di kirim dari server dengan parameter
  // Contoh : roomId = 2, fromUserId = 1, toUserId = 10

  // Validasi agar yang berdering hanya yang di panggil
  if (toUserId == myUserId) {
    console.log('INCOMING CALL (CALLE)');
    callPending = true;
    // Menampilkan modal pada Calle
    const modal = document.getElementById("incomingCallModal");
    modal.classList.remove("hidden");
    // Play ringtone
    const ringtone = document.getElementById("ringtone");
    ringtone.play();

    // Event jika panggilan di terima
    document.getElementById("btnAccept").onclick = async () => {
      console.log('btnAccept click');

      if (!callPending) return;
      callPending = false;

      ringtone.pause(); // Stop ringtone
      ringtone.currentTime = 0; // Reset the playback to the start
      modal.classList.add("hidden"); // Sembunyikan modal pada Calle

      // Menampilkan Modal pada Calle
      const callModal = document.getElementById("callModal");
      callModal.classList.remove("hidden");

      // Mengirim sinyal ke server dengan parameter roomId
      // Contoh : roomId = 2
      socket.emit("accept_call", { roomId });

      // Calle Start MediaSoup
      await startMediasoup(roomId);
    };

    // Event jika panggilan di tolak
    document.getElementById("btnReject").onclick = () => {
      console.log('btnReject click');
      ringtone.pause();
      ringtone.currentTime = 0;

      // Tutup modal incoming call
      document.getElementById("incomingCallModal").classList.add("hidden");

      socket.emit("reject_call", { roomId, fromUserId });
    };
  }

});

// =======================
// INCOMING GROUP CALL
// =======================
socket.on("incoming_group_call", ({ roomId, fromUserId }) => {
  console.log("📞 Incoming GROUP call from", fromUserId, "room:", roomId);

  // Tampilkan modal incoming call
  const modal = document.getElementById("incomingCallModal");
  modal.classList.remove("hidden");

  // Play ringtone
  const ringtone = document.getElementById("ringtone");
  ringtone.currentTime = 0;
  ringtone.play();

  // ACCEPT GROUP CALL
  document.getElementById("btnAccept").onclick = async () => {
    console.log("✅ Accept group call");

    ringtone.pause();
    modal.classList.add("hidden");

    // Tampilkan UI call
    document.getElementById("callModal").classList.remove("hidden");

    // Join mediasoup room
    await startMediasoup(roomId);
  };

  // REJECT GROUP CALL
  document.getElementById("btnReject").onclick = () => {
    console.log("❌ Reject group call");

    ringtone.pause();
    ringtone.currentTime = 0;
    modal.classList.add("hidden");

    socket.emit("reject_group_call", {
      roomId,
      fromUserId
    });
  };
});

// =======================
// CALL ACCEPTED (CALLER) (5)
// =======================
socket.on("call_accepted", async ({ roomId, acceptedBy }) => {
  callConnected = true;
  callPending = false;
  // Caller menerima sinyal dari server bahwa panggilan telah di terima oleh Calle dengan parameter
  // Contoh roomId = 2 , acceptedBy = 10
  console.log("call accepted by", acceptedBy);


  // Ubah setatus panggilan pada Caller menjadi Connected
  // Function updateCallStatus ini ada di script_chat.js
  updateCallStatus("Connected");

  // Caller Start MediaSoup
  await startMediasoup(roomId);

  // Fungsi untuk deteksi suara mikrofon
  //await startMicrophoneDetection();
});

// =======================
// MEDIASOUP START
// Function ini akan di panggil oleh Caller dan Calle
// Fungsi ini dipanggil oleh:
// Caller → setelah call_accepted
// Callee → setelah klik Accept
// =======================
async function startMediasoup(roomId) {
  if (mediasoupStarted) {
    console.warn("⚠️ mediasoup already started");
    return;
  }
  mediasoupStarted = true;

  // Simpan roomId global di client
  // Dipakai oleh: create transport, produce, consume
  currentRoomId = roomId;

  // SIGNALING KE SERVER
  // Memberi tahu server: “Saya mau join mediasoup room ini”
  // 📌 Server akan: mendaftarkan peer, mengirim RTP capabilities, mengirim existing producers
  socket.emit("join_call", { roomId });

  // Client MENUNGGU respon server
  // Event ini: dikirim server setelah peer resmi join room berisi kemampuan codec router (opus, vp8, dll)
  // 📌 once → dipanggil SATU KALI SAJA
  socket.once("router_rtp_capabilities", async (rtpCapabilities) => {
    // Buat instance Device mediasoup-client
    // Device = otak mediasoup di browser
    device = new mediasoupClient.Device();

    // KRUSIAL
    // Sinkronisasi codec browser ↔ server
    // Tanpa ini:
    // ❌ transport tidak bisa dibuat
    // ❌ consume akan gagal
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    // menandakan mediasoup device sudah siap
    deviceReady = true;

    // INI KUNCI BESAR
    // Client SIAP MENERIMA AUDIO ORANG LAIN
    // Harus dilakukan SEBELUM PRODUCE
    // 📌 Kenapa?
    // Kalau producer datang lebih dulu → audio hilang
    await createRecvTransport();

    // Cek apakah recvTransport sudah dibuat dan connect handler aktif
    //if (recvReady) {
    // Consume semua producer yang datang SEBELUM recv siap dan dikumpulkan di pendingProducers
    // Ini yang bikin Peer yang join belakangan langsung dengar suara
    //pendingProducers.forEach(consumeAudio);
    // Kosongkan buffer producer lama
    // Supaya tidak di-consume dua kali
    //pendingProducers = [];
    //}

    flushPendingProducers();

    // BARU PRODUCE SETELAH SIAP RECV
    // Buat send transport
    // Hubungkan ke server
    // Produce audio mic
    // 📌 Ini mencegah:A produce → B belum siap → suara hilang
    await createSendTransport();
  });
}

// =======================
// SEND TRANSPORT
// Fungsi ini bertugas: mengirim audio (producer) dari browser ke mediasoup server
// =======================
async function createSendTransport() {
  if (sendTransport) {
    console.warn("⚠️ sendTransport already exists");
    return;
  }

  console.log("createSendTransport");

  // Karena: ada async socket callback kita ingin await createSendTransport()
  return new Promise(resolve => {
    // SIGNALING KE SERVER Minta server buatkan WebRTC Send Transport
    // Server akan: router.createWebRtcTransport() dan kirim balik params
    // params berisi: id, iceParameters, iceCandidates, dtlsParameters
    socket.emit("create_send_transport", { roomId: currentRoomId }, async (params) => {
      // Client membuat SendTransport lokal
      // Ini bukan WebRTC biasa tapi Ini “pipa” mediasoup khusus untuk upload RTP
      sendTransport = device.createSendTransport(params);

      // EVENT KRUSIAL Dipanggil mediasoup-client Artinya: “Aku siap konek ke server, kirim DTLS ya”
      sendTransport.on("connect", async ({ dtlsParameters }, cb) => {
        console.log("🔥 sendTransport connect triggered");  // Debug: bukti transport mencoba konek
        // HANDSHAKE DTLS
        // Client kirim DTLS ke server
        // Server panggil: transport.connect({ dtlsParameters }) 
        // cb() menandakan: “Server sudah connect, lanjutkan”
        socket.emit("connect_transport", {
          transportId: sendTransport.id,
          dtlsParameters
        }, () => {
          cb();
        });
      });

      // Monitoring status: connecting, connected, failed, closed 
      // Digunakan untuk debug network
      sendTransport.on("connectionstatechange", state => {
        console.log("🔥 sendTransport state:", state);
      });

      // EVENT PRODUCE
      // Dipanggil saat: sendTransport.produce({ track })
      sendTransport.on("produce", (params, cb) => {
        // DAFTARKAN PRODUCER KE SERVER
        // Server akan: transport.produce() lalu: room.peers.get(peerId).producers.set(...)
        // Server balikin producer.id
        socket.emit("produce", {
          transportId: sendTransport.id,
          kind: params.kind,
          rtpParameters: params.rtpParameters
        }, ({ id }) => cb({ id }));
      });

      // Ambil microphone dari browser
      // Ini sumber audio asli
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0]; // Ambil audio track pertama (mic)
      console.log("Audio track produced to sendTransport:", track); // Debug: pastikan mic benar-benar aktif

      // MOMEN PALING PENTING
      // Track dikirim ke server
      // Server bikin producer
      // Server emit new_producer ke peer lain
      // Kalau baris ini tidak jalan → tidak ada suara sama sekali
      await sendTransport.produce({ track });

      // Simpan track lokal:
      // untuk mute/unmute
      // untuk stop saat end call
      localTrack = track;

      // Tandai send transport selesai dibuat
      resolve();
    });
  });
}

// =======================
// RECV TRANSPORT
// Fungsi ini bertugas:
// menerima audio (consumer) dari mediasoup server ke browser
// Send = kirim suara
// Recv = terima suara
// =======================
async function createRecvTransport() {
  console.log("createRecvTransport");

  // Supaya: await createRecvTransport() bisa dipakai di startMediasoup()
  return new Promise(resolve => {
    // SIGNALING KE SERVER
    // Minta server buatkan WebRTC Receive Transport
    // Server akan: router.createWebRtcTransport()
    // params berisi: id, iceParameters, iceCandidates, dtlsParameters
    socket.emit("create_recv_transport", { roomId: currentRoomId }, (params) => {
      // Client membuat RecvTransport
      // Jalur untuk download RTP audio Tanpa ini → consume() tidak bisa
      recvTransport = device.createRecvTransport(params);

      // 🔥 WAJIB ADA INI TITIK KRITIS
      // Dipanggil otomatis oleh mediasoup-client
      // Artinya: “Aku siap konek ke server, kirim DTLS”
      // Kalau handler ini tidak ada: TypeError: no "connect" listener set into this transport
      recvTransport.on("connect", ({ dtlsParameters }, cb) => {
        console.log("🔥 recvTransport connect triggered"); // Menandakan recvTransport benar-benar mencoba konek

        // HANDSHAKE DTLS (DOWNLOAD PATH)
        // Client kirim DTLS ke server
        // Server memanggil: transport.connect({ dtlsParameters })
        // 📌 cb() = lanjutkan proses consume
        socket.emit("connect_transport", {
          transportId: recvTransport.id,
          dtlsParameters
        }, () => {
          cb();
        });
      });

      // Monitoring koneksi: connecting → connected → failed
      // 📌 Sangat berguna untuk debug ICE / network
      recvTransport.on("connectionstatechange", state => {
        console.log("🔥 recvTransport state:", state);
      });

      // Menandakan: “Client sudah siap menerima audio”
      // Dipakai oleh: if (!recvReady) pendingProducers.push(...)
      recvReady = true;

      // Tandai recvTransport selesai dibuat
      resolve();
    });
  });
}


// =======================
// NEW PRODUCER
// Event ini dikirim SERVER saat: ada peer baru produce audio atau peer lama produce ulang
// =======================
socket.on("new_producer", ({ producerId, peerId }) => {
  console.log("📡 new_producer:", producerId, "from", peerId);
  // Mencegah: echo, dengar suara mic sendiri Karena setiap peer juga producer
  if (peerId === myPeerId) {
    console.warn("❌ ignore own producer");
    return;
  }

  queueProducer(producerId);

  // Cek apakah recvTransport sudah siap
  // Kalau belum: consume TIDAK BOLEH karena recvTransport belum connect
  if (!recvReady) {
    // Simpan producer sementara Akan di-consume nanti setelah recv siap Ini mencegah audio “hilang di awal call”
    pendingProducers.push({ producerId, peerId });
    return;
  }

  // Cek apakah: device.load() sudah selesai dan router RTP capability sudah sinkron
  if (!deviceReady) {
    // Simpan producer sementara Akan di-consume nanti setelah recv siap Ini mencegah audio “hilang di awal call”
    pendingProducers.push({ producerId, peerId });
    return;
  }
  consumeAudio(producerId);
});

// Event ini dikirim server saat: client baru join mediasoup room
// server ingin memberi tahu:“Ini daftar producer yang sudah aktif sebelumnya”
// Tanpa ini → peer baru masuk ruangan sunyi total
socket.on("existing_producers", (producers) => {
  console.log("existing producers:", producers);

  // Loop semua producer yang sudah ada
  // Setiap item = 1 sumber audio
  producers.forEach(({ producerId, peerId }) => {
    // jangan consume diri sendiri
    // Mencegah: echo, dengar suara mic sendiri Karena setiap peer juga producer
    if (peerId === myPeerId) return;

    // Cek apakah: recvTransport sudah dibuat dan DTLS sudah siap
    if (!recvReady) {
      // Simpan producer sementara Akan di-consume nanti setelah recv siap Ini mencegah audio “hilang di awal call”
      pendingProducers.push(producerId);
    } else {
      consumeAudio(producerId);
    }
  });
});

// =======================
// PRODUCER QUEUE (ANTI DOUBLE)
// =======================
function queueProducer(producerId) {
  if (consumers.has(producerId)) return;
  pendingProducers.add(producerId);
  flushPendingProducers();
}

function flushPendingProducers() {
  if (!deviceReady || !recvReady) return;

  pendingProducers.forEach(producerId => {
    consumeAudio(producerId);
    pendingProducers.delete(producerId);
  });
}

// =======================
// CONSUME AUDIO
// Fungsi ini dipanggil saat: ada existing_producers dan ada new_producer
// Tujuannya: mengambil audio orang lain dan memainkannya di browser
// 📌 Consume = subscribe ke audio orang lain
// =======================
function consumeAudio(producerId) {
  if (consumers.has(producerId)) {
    console.warn("⚠️ already consuming producer:", producerId);
    return;
  }

  if (!callConnected) {
    console.warn("⏳ call not fully connected yet");
    return;
  }
  console.log("🔥 consumeAudio:", producerId);

  if (!recvReady || !deviceReady) {
    console.warn("⏸️ recv/device not ready");
    return;
  }

  // SIGNALING KE SERVER
  // Minta server buatkan Consumer
  // Berdasarkan producerId tertentu
  socket.emit("consume", {
    roomId: currentRoomId,                    // 
    producerId,                               // Producer yang ingin dikonsumsi Ini ID audio milik peer lain
    rtpCapabilities: device.rtpCapabilities   // SANGAT KRUSIAL Memberitahu server: “Browser saya support codec apa”, Server akan cek: router.canConsume(), Kalau codec tidak cocok → consume ditolak
  }, async ({ id, kind, rtpParameters }) => { // Callback dari server. Server sudah:create consumer kirim data yang dibutuhkan client. Biasanya kind = "audio", rtpParameters = detail RTP stream

    if (consumers.has(producerId)) return;

    const consumer = await recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters
    });

    // Konversi track RTP → MediaStream
    // Supaya bisa diputar HTML5 audio
    const stream = new MediaStream([consumer.track]);

    const audio = document.createElement("audio"); // Buat elemen audio HTML
    audio.srcObject = stream; // Pasangkan audio stream ke element
    audio.autoplay = true;  // Browser langsung play saat data masuk ⚠️ BUTUH user interaction di Chrome
    audio.playsInline = true; // Supaya audio tidak fullscreen (mobile)

    // Elemen audio harus ada di DOM
    // Kalau tidak → kadang tidak bunyi
    document.body.appendChild(audio);

    // 🔥 SIMPAN REFERENSI
    consumers.set(producerId, consumer);
    audioElements.set(producerId, audio);

    console.log("🔊 AUDIO PLAYING");
  });
}

socket.on("peer_muted", ({ peerId, muted }) => {
  console.log(`Peer ${peerId} ${muted ? "🔇 muted" : "🎤 unmuted"}`);
});

// =======================
// END CALL REJECTED
// =======================
socket.on("call_rejected", ({ roomId, rejectedBy }) => {
  console.log("📵 Call rejected by", rejectedBy);
  callPending = false;
  // Update status call
  updateCallStatus("Rejected");

  // Tutup modal CALLER
  closeCallUI();

  // Reset state ringan
  currentRoomId = null;
});

socket.on("peer_joined", ({ peerId, userId, name }) => {
  peers.set(peerId, {
    userId,
    name,
    micActive: false
  });

  //renderParticipants();
});

socket.on("peer_left", ({ peerId }) => {
  peers.delete(peerId);
  //renderParticipants();
});

socket.on("group_call_rejected", ({ rejectedBy }) => {
  console.log("❌ user rejected group call:", rejectedBy);
});

socket.on("call_canceled", ({ roomId, canceledBy }) => {
  console.log("📵 Call canceled by caller:", canceledBy);
  callPending = false;
  // Stop ringtone
  const ringtone = document.getElementById("ringtone");
  if (ringtone) {
    ringtone.pause();
    ringtone.currentTime = 0;
  }

  // Tutup modal incoming call
  document.getElementById("incomingCallModal")?.classList.add("hidden");

  // Optional UI update
  updateCallStatus?.("Missed call");

  // Reset state ringan
  currentRoomId = null;
});

// =======================
// END CALL
// =======================
socket.on("call_ended", ({ peerId }) => {
  console.log("📴 peer ended call", peerId);
  cleanupMedia();
  closeCallUI();
});

window.toggleMute = () => {
  if (!localTrack) {
    console.warn("❌ No local track to mute");
    return;
  }

  isMuted = !isMuted;

  // 🔥 INTI MUTE / UNMUTE
  localTrack.enabled = !isMuted;

  socket.emit("producer_mute", {
    muted: isMuted
  });

  const icon = document.querySelector("#btnMute i");

  if (isMuted) {
    console.log("🔇 Microphone MUTED");
    icon.classList.remove("microphone-active");
    icon.classList.add("microphone-muted");
  } else {
    console.log("🎤 Microphone UNMUTED");
    icon.classList.remove("microphone-muted");
    icon.classList.add("microphone-active");
  }
};

window.endCallBeforeAccepted = () => {
  if (!currentRoomId || !currentTargetUserId) return;

  console.log("📴 Caller canceled call");

  socket.emit("cancel_call", {
    roomId: currentRoomId,
    targetUserId: currentTargetUserId
  });

  closeCallUI();
  updateCallStatus("Canceled");

  currentRoomId = null;
  currentTargetUserId = null;
};


window.endCall = () => {
  if (callPending) {
    endCallBeforeAccepted();
  }
  if (!currentRoomId) return;
  socket.emit("end_call");
  cleanupMedia();
  closeCallUI();
}

function closeCallUI() {
  document.getElementById("incomingCallModal")?.classList.add("hidden");
  document.getElementById("callModal")?.classList.add("hidden");

  isMuted = false;
  // document.getElementById("btnMute").innerText = "Mute";
}

function cleanupMedia() {
  console.log("🧹 cleanupMedia");

  try {
    // 1️⃣ Stop local mic
    if (localTrack) {
      localTrack.stop();
      localTrack = null;
    }

    // 2️⃣ Stop mic analyser
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }

    if (micAnimationId) {
      cancelAnimationFrame(micAnimationId);
      micAnimationId = null;
    }

    // 3️⃣ Close all consumers & remove audio
    consumers.forEach((consumer, producerId) => {
      consumer.close();
      const audio = audioElements.get(producerId);
      if (audio) audio.remove();
    });

    consumers.clear();
    audioElements.clear();

    // 4️⃣ Close transports
    if (sendTransport) {
      sendTransport.close();
      sendTransport = null;
    }

    if (recvTransport) {
      recvTransport.close();
      recvTransport = null;
    }

    // 5️⃣ Reset device & state
    device = null;
    deviceReady = false;
    recvReady = false;
    pendingProducers.clear();
    currentRoomId = null;
    isMuted = false;
    callConnected = false;


    console.log("✅ cleanup done");
  } catch (err) {
    console.warn("cleanup error", err);
  }
}

function renderParticipants() {
  const container = document.getElementById("participants");
  container.innerHTML = "";

  peers.forEach((peer, peerId) => {
    const div = document.createElement("div");
    div.className = "participant";

    div.innerHTML = `
      <span>${peer.name}</span>
      <span class="mic ${peer.micActive ? "active" : "muted"}">
        ${peer.micActive ? "🎤" : "🔇"}
      </span>
    `;

    container.appendChild(div);
  });
}


// Fungsi untuk memulai analisis mikrofon
async function startMicrophoneDetection() {
  if (!localTrack) return;

  // Buat AudioContext untuk menganalisis volume
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();

  micStream = new MediaStream([localTrack]);
  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function detectMicActivity() {
    if (isMuted) {
      requestAnimationFrame(detectMicActivity);
      return;
    }

    analyser.getByteFrequencyData(dataArray);

    // Hitung rata-rata nilai volume suara
    let total = 0;
    for (let i = 0; i < bufferLength; i++) {
      total += dataArray[i];
    }
    const averageVolume = total / bufferLength;

    // Jika volume lebih dari 50, aktifkan mikrofon
    if (averageVolume > 50) {
      if (!isMicActive) {
        isMicActive = true;
        document.querySelector("#btnMute i").classList.add("microphone-active");
      }
    } else {
      if (isMicActive) {
        isMicActive = false;
        document.querySelector("#btnMute i").classList.remove("microphone-active");
        document.querySelector("#btnMute i").classList.add("microphone-muted");
      }
    }

    //requestAnimationFrame(detectMicActivity);
    micAnimationId = requestAnimationFrame(detectMicActivity);
  }

  detectMicActivity();
}