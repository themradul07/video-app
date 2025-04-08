const users = new Map();

module.exports = (io, socket) => {
  socket.on("join-room", ({ roomId, userId, username }) => {
    socket.join(roomId);
    users.set(socket.id, { userId, roomId, username });
    socket.to(roomId).emit("user-connected", { socketId: socket.id, userId, username });
  });

  socket.on("signal", ({ to, from, signal }) => {
    io.to(to).emit("signal", { from, signal });
  });

  socket.on("chat-message", ({ roomId, message, userId, username }) => {
    io.to(roomId).emit("chat-message", { message, userId, username });
  });

  socket.on("media-toggle", ({ roomId, userId, type, state }) => {
    io.to(roomId).emit("media-toggle", { userId, type, state });
  });

  socket.on("reaction", ({ roomId, userId, reaction }) => {
    io.to(roomId).emit("reaction", { userId, reaction });
  });

  socket.on("raise-hand", ({ roomId, userId }) => {
    io.to(roomId).emit("raise-hand", { userId });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      io.to(user.roomId).emit("user-disconnected", { userId: user.userId });
      users.delete(socket.id);
    }
  });
};
