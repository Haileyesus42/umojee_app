// import 'module-alias/register';

import express from 'express';
import app from "./app"; // Use the configured app from ./app
import cors from 'cors';
import aiProxy, { setupAiWebSocketProxy } from "./middleware/aiProxy";
import { setupNotificationWebSocketServer } from "./middleware/notificationSocket";
import mongoose from 'mongoose';

// Add JSON body parser middleware with increased limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Define the port
const PORT = process.env.PORT || 3000;
app.use("/api/ai", aiProxy);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mmoja');
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
};

let server: any = null;

connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    setupAiWebSocketProxy(server);
    setupNotificationWebSocketServer(server);
  })
  .catch(err => {
    console.error('❌ Failed to connect to MongoDB:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: any) => {
  console.log(`${err.name}: ${err.message}`);
  console.log("Unhandled Rejection! Shutting down the server...");

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err: any) => {
  console.log(`${err.name}: ${err.message}`);
  console.log("Uncaught Exception! Shutting down the server...");

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  if (server) {
    server.close(() => {
      console.log("💥 Process terminated!");
    });
  }
});