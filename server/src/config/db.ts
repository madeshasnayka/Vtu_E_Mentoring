import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb://127.0.0.1:27017/vtu_mentorship';

export const connectDB = async (): Promise<void> => {
  try {
    const maskedUri = MONGO_URI.replace(/:([^:@]{4})[^:@]*@/, ':****@');
    console.log(`[Database] Connecting to: ${maskedUri}`);

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      family: 4, // Force IPv4
    });

    console.log(`[Database] MongoDB Connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error: any) {
    console.error('\n======================================================');
    console.error('[DATABASE CONNECTION FAILED]');
    console.error('Message:', error.message);
    console.error('======================================================\n');
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] Disconnected from MongoDB. Reconnecting...');
});

mongoose.connection.on('connected', () => {
  console.log('[Database] MongoDB connection established.');
});

export default connectDB;