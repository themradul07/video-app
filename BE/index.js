const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const db = require("./config/db");
const socketHandler = require("./socket");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Connect DB
(async () => {
  try {
    await db.authenticate();
    console.log("Database connected...");
  } catch (err) {
    console.error("DB connection failed:", err);
  }
})();

// Initialize Socket.IO
io.on("connection", (socket) => socketHandler(io, socket));

server.listen(5000, () => console.log("Server running on http://localhost:5000"));