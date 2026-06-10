// db.js
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    // Use MONGODB_URL from .env file (fallback to MONGODB_URI for compatibility)
    const mongoURI: string | undefined = process.env.MONGODB_URL || process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || "umoja_node";
    // console.log(mongoURI);
    if (mongoURI) {
      await mongoose.connect(mongoURI, { dbName });
    }

    console.log(`Connected to MongoDB database: ${dbName}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;