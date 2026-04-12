import mongoose from 'mongoose';
import { env } from './env.js';

export const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000
    };

    if (env.mongoUri.startsWith('mongodb+srv://')) {
      options.tls = true;
    }

    if (env.mongoTlsAllowInvalidCertificates) {
      options.tlsAllowInvalidCertificates = true;
    }

    await mongoose.connect(env.mongoUri, options);

    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};