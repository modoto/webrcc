import * as mediasoupClient from "https://esm.sh/mediasoup-client@3";

const socket = io("/", {
  auth: { token }
});

//const socket = io("https://meeting.modoto.net/");

let device;
let sendTransport;
let recvTransport;
let localAudioTrack;
let localVideoTrack;
const consumers = new Map();
const consumerElements = new Map(); // 🔥 producerId -> element
const producers = new Map(); // kind -> producer
const videoElements = new Map(); // id -> <video>

let callActive = false;
let callPending = false;
let currentRoomId = null;
let currentTargetUserId = null;
let currentCallerUserId = null;

let micMuted = false;

// VAD
let audioContext;
let analyser;
let dataArray;
let vadRunning = false;

const users = new Map();
//const roomId = "room1";

// ================= START =================
window.startCall = async (roomId, targetUserId) => {
  console.log('START CALL (CALLER)');
  console.log(roomId);
  console.log(targetUserId);

  callActive = true;

  // Menampilkan Modal pada caller
  const modal = document.getElementById("callModal");
  modal.classList.remove("hidden");

  callPending = true;
  currentTargetUserId = targetUserId
  currentRoomId = roomId;

  startMediasoup(roomId);
  socket.emit("call_user", { roomId, targetUserId });
};

async function startMediasoup(roomId) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });

  startVAD(stream);

  localAudioTrack = stream.getAudioTracks()[0];
  //localVideoTrack = stream.getVideoTracks()[0];

  const rtpCapabilities = await new Promise(res =>
    socket.emit("joinRoom", roomId, res)
  );

  device = new mediasoupClient.Device();
  await device.load({ routerRtpCapabilities: rtpCapabilities });

  // SEND transport
  const sendParams = await new Promise(res =>
    socket.emit("createTransport", res)
  );

  sendTransport = device.createSendTransport(sendParams);

  sendTransport.on("connect", ({ dtlsParameters }, cb) => {
    socket.emit("connectTransport", {
      transportId: sendTransport.id,
      dtlsParameters
    });
    cb();
  });

  sendTransport.on("produce", ({ kind, rtpParameters }, cb) => {
    socket.emit("produce", {
      transportId: sendTransport.id,
      kind,
      rtpParameters
    }, ({ id }) => cb({ id }));
  });

  // 🔥 produce audio + video
  const audioProducer = await sendTransport.produce({
    track: localAudioTrack
  });
  producers.set("audio", audioProducer);

  // const videoProducer = await sendTransport.produce({
  //   track: localVideoTrack
  // });
  // producers.set("video", videoProducer);


  // tampilkan kamera sendiri
  // addVideo(stream, "self");

  // RECV transport
  const recvParams = await new Promise(res =>
    socket.emit("createTransport", res)
  );

  recvTransport = device.createRecvTransport(recvParams);

  recvTransport.on("connect", ({ dtlsParameters }, cb) => {
    socket.emit("connectTransport", {
      transportId: recvTransport.id,
      dtlsParameters
    });
    cb();
  });

  const producerIds = await new Promise(res =>
    socket.emit("getProducers", res)
  );

  for (const id of producerIds) {
    await consume(id);
  }

  console.log("🎥 Video call ready");
}

// ================= CONSUME =================
async function consume(producerId) {
  if (!recvTransport || !device) {
    console.warn("⛔ consume skipped, transport not ready");
    return;
  }

  if (consumers.has(producerId)) return;

  const params = await new Promise(res =>
    socket.emit("consume", {
      transportId: recvTransport.id,
      producerId,
      rtpCapabilities: device.rtpCapabilities
    }, res)
  );

  if (!params) return;

  const consumer = await recvTransport.consume(params);
  consumers.set(producerId, consumer);

  const stream = new MediaStream();
  stream.addTrack(consumer.track);

  if (consumer.kind === "audio") {
    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.dataset.producerId = producerId;

    document.body.appendChild(audio);

    consumerElements.set(producerId, audio);
  }

  // if (consumer.kind === "video") {
  //   addVideo(stream, producerId);
  // }
}

function addVideo(stream, id) {
  // 🔥 prevent duplicate
  if (videoElements.has(id)) return;

  const video = document.createElement("video");
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.muted = id === "self";

  video.id = "video-" + id;

  document.getElementById("videos").appendChild(video);
  videoElements.set(id, video);
}

// ================= SOCKET EVENTS =================

// =======================
// INCOMING CALL (CALLE) (3)
// =======================
socket.on("incoming_call", ({ roomId, fromUserId, toUserId }) => {
  // Target atau Calle menerima sinyal yang di kirim dari server dengan parameter
  // Contoh : roomId = 2, fromUserId = 1, toUserId = 10
  currentCallerUserId = fromUserId;
  currentRoomId = roomId;
  // Validasi agar yang berdering hanya yang di panggil
  if (toUserId == myUserId) {
    console.log('INCOMING CALL (CALLE)');
    // Menampilkan modal pada Calle
    const modal = document.getElementById("incomingCallModal");
    modal.classList.remove("hidden");
    // Play ringtone
    //const ringtone = document.getElementById("ringtone");
    //ringtone.play();

    // Event jika panggilan di terima
    document.getElementById("btnAccept").onclick = async () => {
      console.log('btnAccept click');

      //ringtone.pause(); // Stop ringtone
      //ringtone.currentTime = 0; // Reset the playback to the start
      modal.classList.add("hidden"); // Sembunyikan modal pada Calle

      // Menampilkan Modal pada Calle
      const callModal = document.getElementById("callModal");
      callModal.classList.remove("hidden");

      // Calle Start MediaSoup
      await startMediasoup(roomId);

      // Mengirim sinyal ke server dengan parameter roomId
      // Contoh : roomId = 2
      socket.emit("accept_call", { roomId });

    };

    // Event jika panggilan di tolak
    document.getElementById("btnReject").onclick = () => {
      console.log('btnReject click');
      ringtone.pause();
      ringtone.currentTime = 0;

      // Tutup modal incoming call
      document.getElementById("incomingCallModal").classList.add("hidden");

      socket.emit("reject_call", { roomId, currentCallerUserId });
      currentCallerUserId = null;
    };
  }

});

// =======================
// CALL ACCEPTED (CALLER) (5)
// =======================
socket.on("call_accepted", async ({ roomId, acceptedBy }) => {
  // Caller menerima sinyal dari server bahwa panggilan telah di terima oleh Calle dengan parameter
  // Contoh roomId = 2 , acceptedBy = 10
  console.log("call accepted by", acceptedBy);
  callPending = false;

  // Ubah setatus panggilan pada Caller menjadi Connected
  // Function updateCallStatus ini ada di script_chat.js
  updateCallStatus("Connected");

  // Caller Start MediaSoup
  //await startMediasoup(roomId);

  // Fungsi untuk deteksi suara mikrofon
  //await startMicrophoneDetection();
});

socket.on("call_rejected", ({ roomId, rejectedBy }) => {
  console.log("📵 Call rejected by", rejectedBy);
  callPending = false;
  // Update status call
  updateCallStatus("Rejected");
  cleanupMedia();
  closeCallUI();
});


socket.on("newProducer", async ({ producerId }) => {
  if (!callActive) {
    console.warn("⛔ newProducer ignored, call not active");
    return;
  }
  await consume(producerId);
});

socket.on("userList", list => {
  users.clear();
  list.forEach(u => users.set(u.id, u));
  renderUsers();
});

socket.on("userSpeaking", ({ id, speaking }) => {
  if (users.has(id)) {
    users.get(id).speaking = speaking;
    renderUsers();
  }
});

socket.on("producerClosed", ({ producerId }) => {
  console.log("Producer closed:", producerId);

  const consumer = consumers.get(producerId);
  if (consumer) {
    consumer.close();
    consumers.delete(producerId);
  }

  const el = consumerElements.get(producerId);
  if (el) {
    el.srcObject = null;
    el.remove();
    consumerElements.delete(producerId);
  }

  // 🔥 REMOVE VIDEO
  const video = videoElements.get(producerId);
  if (video) {
    video.srcObject = null;
    video.remove();
    videoElements.delete(producerId);
  }
});

// socket.on("call_ended", ({ peerId }) => {
//   console.log("📴 peer ended call", peerId);
//   cleanupMedia();
//   closeCallUI();
// });

socket.on("call_ended", ({ roomId, endedBy }) => {
  console.log("📴 Call ended by", endedBy);

  // 🔥 pastikan ini call yang aktif
  if (roomId !== currentRoomId) return;

  cleanupMedia();
  closeCallUI();
});

socket.on("call_canceled", ({ roomId, canceledBy }) => {
  console.log("📵 Call canceled by caller:", canceledBy);
  callPending = false;
  // Stop ringtone
  // const ringtone = document.getElementById("ringtone");
  // if (ringtone) {
  //   ringtone.pause();
  //   ringtone.currentTime = 0;
  // }

  // Tutup modal incoming call
  document.getElementById("incomingCallModal")?.classList.add("hidden");

  // Optional UI update
  updateCallStatus?.("Missed call");

  // Reset state ringan
  currentRoomId = null;
});

// ================= STOP =================
window.stop = () => {
  console.log("Stopping call...");

  // 🔥 close consumers
  consumers.forEach(c => c.close());
  consumers.clear();

  // 🔥 remove audio elements
  consumerElements.forEach(el => {
    el.srcObject = null;
    el.remove();
  });
  consumerElements.clear();

  // 🔥 close producers
  producers.forEach(p => p.close());
  producers.clear();

  // 🔥 close transports
  if (sendTransport) sendTransport.close();
  if (recvTransport) recvTransport.close();

  // 🔥 stop local tracks
  if (localAudioTrack) localAudioTrack.stop();
  if (localVideoTrack) localVideoTrack.stop();

  // 🔥 STOP & CLEAR ALL VIDEOS (INI FIX BLACK BOX)
  videoElements.forEach(video => {
    video.srcObject = null;
    video.remove();
  });
  videoElements.clear();

  // 🔥 stop VAD
  vadRunning = false;
  if (audioContext) audioContext.close();

  //removeUserFromSidebar();

  socket.emit("disconnect");

  console.log("Call stopped ❌");
};

// 🔥 MUTE / UNMUTE

window.toggleMute = () => {
  if (!localAudioTrack) return;

  micMuted = !micMuted;
  localAudioTrack.enabled = !micMuted;

  const micIcon = document.getElementById("micIcon");

  if (micMuted) {
    // Mute
    micIcon.classList.remove("fa-microphone");
    micIcon.classList.add("fa-microphone-slash");
  } else {
    // Unmute
    micIcon.classList.remove("fa-microphone-slash");
    micIcon.classList.add("fa-microphone");
  }
  console.log(micMuted ? "Mic muted 🔇" : "Mic unmuted 🎤");
};

window.endCallBeforeAccepted = () => {
  if (!currentRoomId || !currentTargetUserId) return;
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
    console.log("📴 End Call Before Accepted");
    endCallBeforeAccepted();
  } else {
    console.log("📴 End Call After Accepted");
    socket.emit("end_call", {
      roomId: currentRoomId,
      targetUserId: currentTargetUserId
    });
  }

  cleanupMedia();
  closeCallUI();


  // console.log("📴 End call");

  // socket.emit("end_call", {
  //   roomId: currentRoomId
  // });

  // cleanupMedia();
  // closeCallUI();
}

function closeCallUI() {
  console.log("🧹 closeCallUI");
  document.getElementById("incomingCallModal")?.classList.add("hidden");
  document.getElementById("callModal")?.classList.add("hidden");

  micMuted = false;
  // document.getElementById("btnMute").innerText = "Mute";
}

function cleanupMedia() {
  console.log("🧹 cleanupMedia");

  callActive = false;
  // stop consumers
  consumers.forEach(c => c.close());
  consumers.clear();

  // remove audio
  consumerElements.forEach(el => {
    el.srcObject = null;
    el.remove();
  });
  consumerElements.clear();

  // close producers
  producers.forEach(p => p.close());
  producers.clear();

  // close transports
  if (sendTransport) sendTransport.close();
  if (recvTransport) recvTransport.close();
  sendTransport = null;
  recvTransport = null;

  // stop mic
  if (localAudioTrack) {
    localAudioTrack.stop();
    localAudioTrack = null;
  }

  // stop VAD
  vadRunning = false;
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  device = null;
  currentRoomId = null;
  currentTargetUserId = null;
  micMuted = false;
  callPending = false;

  //removeUserFromSidebar();

  console.log("✅ cleanupMedia done");
}

// ================= VAD =================
function startVAD(stream) {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;

  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  vadRunning = true;
  detectVoice();
}

function detectVoice() {
  if (!vadRunning) return;

  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];

  const volume = sum / dataArray.length;
  const speaking = volume > 25;

  socket.emit("speaking", speaking);
  requestAnimationFrame(detectVoice);
}

// ================= UI =================
function renderUsers() {
  // const container = document.getElementById("users");
  // container.innerHTML = "";

  // users.forEach(u => {
  //   const div = document.createElement("div");
  //   div.className = "user" + (u.speaking ? " speaking" : "");
  //   div.textContent = (u.speaking ? "🎤 " : "🔇 ") + u.name;
  //   container.appendChild(div);
  // });
}

function removeUserFromSidebar() {
  const container = document.getElementById("users");
  container.innerHTML = "";
}

