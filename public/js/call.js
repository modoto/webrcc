import * as mediasoupClient from "https://esm.sh/mediasoup-client@3";

const socket = io("/", {
    auth: { token }
});

let device;
let sendTransport;
let recvTransport;
let localTrack;
let currentRoomId = null;
let deviceReady = false;
let pendingProducers = [];
let recvReady = false;

let micAnalyser; 
let micStream;
let isMicActive = false;

// =======================
// START CALL (CALLER) (1)
// =======================
window.startCall = (roomId, targetUserId) => {
    console.log('START CALL (CALLER)');

    const modal = document.getElementById("callModal");
    modal.classList.remove("hidden");

    currentRoomId = roomId;
    socket.emit("call_user", { roomId, targetUserId });
};

// =======================
// INCOMING CALL (CALLE) (3)
// =======================
socket.on("incoming_call", ({ roomId, fromUserId, toUserId }) => {

    if (toUserId == myUserId) {
        console.log('INCOMING CALL (CALLE)');
        console.log('roomId:', roomId);
        console.log('myUserId:', myUserId);
        console.log('fromUserId:', fromUserId);
        console.log('berdering');

        const modal = document.getElementById("incomingCallModal");
        const ringtone = document.getElementById("ringtone");

        modal.classList.remove("hidden");
        ringtone.play();

        document.getElementById("btnAccept").onclick = () => {
            console.log('btnAccept click');
            ringtone.pause();
            modal.classList.add("hidden");

            socket.emit("accept_call", { roomId });
            startMediasoup(roomId);
        };

        document.getElementById("btnReject").onclick = () => {
            console.log('btnReject click');
            ringtone.pause();
            modal.classList.add("hidden");

            socket.emit("reject_call", { roomId, fromUserId });
        };
    }

});

// =======================
// CALL ACCEPTED (CALLER) (5)
// =======================
socket.on("call_accepted", async ({ roomId, acceptedBy }) => {
    console.log("call accepted by", acceptedBy);
    updateCallStatus("Connected");
    //await joinMediasoupRoom(roomId);
    startMediasoup(roomId);
    // Mulai deteksi suara mikrofon
    await startMicrophoneDetection();
});

// =======================
// MEDIASOUP START
// =======================
async function startMediasoup(roomId) {
  currentRoomId = roomId;
  socket.emit("join_call", { roomId });

  socket.once("router_rtp_capabilities", async (rtpCapabilities) => {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });

    deviceReady = true;

    await createSendTransport();
    await createRecvTransport();

    for (const producerId of pendingProducers) {
      consumeAudio(producerId);
    }
    pendingProducers = [];
  });
}

// =======================
// SEND TRANSPORT
// =======================

async function createSendTransport() {
  console.log("createSendTransport");

  socket.emit("create_send_transport", { roomId: currentRoomId }, async (params) => {
    sendTransport = device.createSendTransport(params);

    sendTransport.on("connect", ({ dtlsParameters }, cb) => {
      console.log("sendTransport connected", dtlsParameters);
      socket.emit("connect_transport", {
        transportId: sendTransport.id,
        dtlsParameters
      });
      cb();
    });

    sendTransport.on("produce", (params, cb) => {
      socket.emit("produce", {
        transportId: sendTransport.id,
        kind: params.kind,
        rtpParameters: params.rtpParameters
      }, ({ id }) => cb({ id }));
    });

    // Ambil media dari user (audio)
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = stream.getAudioTracks()[0];
    console.log("Audio track produced to sendTransport:", track);

    // Kirimkan track audio ke transport
    await sendTransport.produce({ track });

    // Simpan track lokal untuk referensi nanti
    localTrack = track;
  });
}


// =======================
// RECV TRANSPORT
// =======================
async function createRecvTransport() {
  console.log("createRecvTransport");

  socket.emit("create_recv_transport", { roomId: currentRoomId }, (params) => {
    recvTransport = device.createRecvTransport(params);

    recvTransport.on("connect", ({ dtlsParameters }, cb) => {
      console.log("recvTransport connected", dtlsParameters);
      socket.emit("connect_transport", {
        transportId: recvTransport.id,
        dtlsParameters
      });
      cb();
    });

    recvReady = true;
    pendingProducers.forEach(consumeAudio); // Consume producer yang tertunda
    pendingProducers = [];
  });
}

// =======================
// NEW PRODUCER
// =======================
socket.on("new_producer", ({ producerId }) => {
  if (!deviceReady) {
    pendingProducers.push(producerId);
    return;
  }
  consumeAudio(producerId);
});

// =======================
// CONSUME AUDIO
// =======================
function consumeAudio(producerId) {
  socket.emit("consume", {
    roomId: currentRoomId,
    producerId,
    rtpCapabilities: device.rtpCapabilities
  }, async ({ id, kind, rtpParameters }) => {
    // Konsumsi audio dari producer
    const consumer = await recvTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters
    });

    const stream = new MediaStream([consumer.track]);

    const audio = document.createElement("audio");
    audio.srcObject = stream;
    audio.autoplay = true;
    audio.playsInline = true;

    // Debugging: cek apakah elemen audio sudah benar
    console.log("Audio element created and added to DOM");

    document.body.appendChild(audio); // Menambahkan audio ke DOM
  });
}






// =======================
// END CALL
// =======================
socket.on("call_ended", ({ peerId }) => {
    console.log("📴 peer ended call", peerId);
    cleanupMedia();
    closeCallUI();
});
window.endCall = () => {
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
    try {
        if (localTrack) {
            localTrack.stop();
            localTrack = null;
        }

        if (sendTransport) {
            sendTransport.close();
            sendTransport = null;
        }

        if (device) {
            device = null;
        }
    } catch (err) {
        console.warn("cleanup error", err);
    }
}

// Fungsi untuk memulai analisis mikrofon
async function startMicrophoneDetection() {
  // Ambil stream audio
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  // Buat AudioContext untuk menganalisis volume
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(micStream);
  source.connect(analyser);

  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function detectMicActivity() {
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

    requestAnimationFrame(detectMicActivity);
  }

  detectMicActivity();
}