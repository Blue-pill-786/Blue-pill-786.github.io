import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: true, // dev fix for your SSL nonsense
    });

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};