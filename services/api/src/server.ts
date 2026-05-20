// import 'module-alias/register';

import app from "./app";
import aiProxy, { setupAiWebSocketProxy } from "./middleware/aiProxy";
import { setupNotificationWebSocketServer } from "./middleware/notificationSocket";

// Define the port
const PORT = process.env.PORT || 3000;
app.use("/api/ai", aiProxy);

process.on("uncaughtException", (err: any) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  process.exit(1);
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

setupAiWebSocketProxy(server);
setupNotificationWebSocketServer(server);

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.log(`${err.name}: ${err.message}`);
  console.log("Unhandled Rejection! Shutting down the server...");

  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  console.log(`${err.name}: ${err.message}`);
  console.log("Uncaught Exception! Shutting down the server...");

  server.close(() => {
    process.exit(1);
  });
});
process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});
