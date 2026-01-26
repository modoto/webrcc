import * as mediasoupClient from "https://esm.sh/mediasoup-client@3";

const socket = io("/", {
    auth: { token }
});

let device;
let sendTransport;
let localTrack;
let currentRoomId = null;
// =======================
// START CALL (CALLER)
// =======================
window.startCall = (roomId, targetUserId) => {
    currentRoomId = roomId;
    socket.emit("call_user", { roomId, targetUserId });
    console.log('call_user');
    const modal = document.getElementById("callModal");
    modal.classList.remove("hidden");
};

// =======================
// INCOMING CALL
// =======================
socket.on("incoming_call", ({ roomId, fromUserId }) => {
    console.log('incoming_call');
    const modal = document.getElementById("incomingCallModal");
    const ringtone = document.getElementById("ringtone");

    modal.classList.remove("hidden");
    ringtone.play();

    document.getElementById("btnAccept").onclick = () => {
        ringtone.pause();
        modal.classList.add("hidden");

        socket.emit("accept_call", { roomId });
        startMediasoupCall(roomId);
    };

    document.getElementById("btnReject").onclick = () => {
        ringtone.pause();
        modal.classList.add("hidden");

        socket.emit("reject_call", { roomId, fromUserId });
    };
});

socket.on("call_ended", ({ peerId }) => {
    console.log("📴 peer ended call", peerId);
    cleanupMedia();
    closeCallUI();
});

function closeCallUI() {
    document.getElementById("incomingCallModal")?.classList.add("hidden");
    document.getElementById("callUI")?.classList.add("hidden");

    isMuted = false;
    document.getElementById("btnMute").innerText = "Mute";
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




// =======================
// MEDIASOUP START
// =======================
async function startMediasoupCall(roomId) {
    socket.emit("join_call", { roomId });

    socket.on("router_rtp_capabilities", async (rtpCapabilities) => {
        const device = new mediasoupClient.Device();
        await device.load({ routerRtpCapabilities: rtpCapabilities });

        socket.emit("create_transport", { roomId }, async (params) => {
            const transport = device.createSendTransport(params);

            transport.on("connect", ({ dtlsParameters }, cb) => {
                socket.emit("connect_transport", {
                    transportId: transport.id,
                    dtlsParameters
                });
                cb();
            });

            transport.on("produce", (params, cb) => {
                socket.emit("produce", {
                    transportId: transport.id,
                    kind: params.kind,
                    rtpParameters: params.rtpParameters
                }, ({ id }) => cb({ id }));
            });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localTrack = stream.getAudioTracks()[0];
            await transport.produce({ track: localTrack });
        });
    });
}


// =======================
// END CALL
// =======================
document.getElementById("btnEndCall").onclick = () => {
    endCall();
};

function endCall() {
    if (!currentRoomId) return;

    socket.emit("end_call");

    cleanupMedia();
    closeCallUI();
}