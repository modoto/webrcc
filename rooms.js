const rooms = new Map();
function getOrCreateRoom(roomId, router) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      router,
      peers: new Map()
    });
  }
  return rooms.get(roomId);
}

module.exports = { getOrCreateRoom };
