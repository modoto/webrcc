import * as mediasoupClient from "https://esm.sh/mediasoup-client@3";

const socket = io("https://localhost:8443", {
    transports: ["websocket"]
});

let device, transport;

socket.on("rtpCapabilities", async caps => {
    device = new mediasoupClient.Device();
    await device.load({ routerRtpCapabilities: caps });

    socket.emit("createTransport", null, data => {
        transport = device.createRecvTransport(data);

        transport.on("connect", ({ dtlsParameters }, cb) => {
            socket.emit("connectTransport", { dtlsParameters });
            cb();
        });

        socket.emit("consume", null, async params => {
            const consumer = await transport.consume(params);
            const stream = new MediaStream();
            stream.addTrack(consumer.track);
            document.getElementById("video").srcObject = stream;
        });
    });
});