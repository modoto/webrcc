const mediasoup = require("mediasoup");

let worker;
let router;

async function initMediasoup() {
  worker = await mediasoup.createWorker({
    rtcMinPort: 40000,
    rtcMaxPort: 49999
  });

  worker.on("died", () => {
    console.error("❌ mediasoup worker died");
    process.exit(1);
  });

  router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      }
    ]
  });

  console.log("✅ mediasoup initialized");
}

function getRouter() {
  if (!router) throw new Error("Router not initialized");
  return router;
}

module.exports = {
  initMediasoup,
  getRouter
};
