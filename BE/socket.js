
const usersInRoom = {};

module.exports = (io, socket) => {
  io.on("connection", (socket) => {
    socket.on("join-room", ({ roomId, userId }) => {
      if (!usersInRoom[roomId]) {
        usersInRoom[roomId] = [];
      }
  
      usersInRoom[roomId].push(socket.id);
      socket.join(roomId);
  
      // Notify existing users
      socket.to(roomId).emit("user-joined", socket.id);
  
      // Send existing users to the new user
      usersInRoom[roomId].forEach(id => {
        if (id !== socket.id) {
          socket.emit("user-joined", id);
        }
      });
  
      socket.on("offer", (payload) => {
        io.to(payload.to).emit("offer", { from: socket.id, offer: payload.offer });
      });
  
      socket.on("answer", (payload) => {
        io.to(payload.to).emit("answer", { from: socket.id, answer: payload.answer });
      });
  
      socket.on("ice-candidate", (payload) => {
        io.to(payload.to).emit("ice-candidate", { from: socket.id, candidate: payload.candidate });
      });
  
      socket.on("send-message", ({ roomId, message, sender }) => {
        io.to(roomId).emit("receive-message", { sender, message });
      });
  
      socket.on("disconnect", () => {
        usersInRoom[roomId] = usersInRoom[roomId]?.filter(id => id !== socket.id);
        socket.to(roomId).emit("user-disconnected", socket.id);
      });
    });
  });
};
