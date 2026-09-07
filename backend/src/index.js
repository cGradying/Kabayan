import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import authRouter from "./routes/auth.js";
import jobsRouter from "./routes/jobs.js";
import applicationsRouter from "./routes/applications.js";
import marketplaceRouter from "./routes/marketplace.js";
import messagesRouter from "./routes/messages.js";
import conversationsRouter from "./routes/conversations.js";
import profilesRouter from "./routes/profiles.js";
import peopleRouter from "./routes/people.js";
import miscRouter from "./routes/misc.js";
import assistantRouter from "./routes/assistant.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/applications", applicationsRouter);
app.use("/api/marketplace", marketplaceRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/profiles", profilesRouter);
app.use("/api/people", peopleRouter);
app.use("/api", miscRouter);
app.use("/api/assistant", assistantRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

io.on("connection", (socket) => {
  socket.on("join:room", (roomId) => {
    socket.join(roomId);
  });
  socket.on("leave:room", (roomId) => {
    socket.leave(roomId);
  });
  socket.on("message:send", (data) => {
    io.to(data.room_id).emit("message:new", data);
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Kabayan API running on port ${PORT}`);
});
