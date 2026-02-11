const mediasoup = require("mediasoup");

let worker;
let router;

async function createMediasoup() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  });

  console.log("Worker PID:", worker.pid);

  const mediaCodecs = [
    // 🎤 AUDIO
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },

    // 🎥 VIDEO VP8 (universal)
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {
        "x-google-start-bitrate": 1000,
      },
    },

    // 🎥 VIDEO H264 (fallback / Safari)
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "packetization-mode": 1,
        "profile-level-id": "42e01f",
        "level-asymmetry-allowed": 1,
      },
    },
  ];

  router = await worker.createRouter({ mediaCodecs });

  return { worker, router };
}

module.exports = { createMediasoup };
