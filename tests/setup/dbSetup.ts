import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Use a global variable so it persists across test suites in the same process
let mongoServer: MongoMemoryServer | null = (global as any).__MONGO_SERVER__ || null;

export const connectDB = async () => {
  // If already connected to a database, do nothing
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // If no server exists yet, create one
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    (global as any).__MONGO_SERVER__ = mongoServer;
  }

  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const clearDB = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const closeDB = async () => {
  await mongoose.disconnect();
  // Adding a small delay helps Jest close gracefully before forceExit kicks in.
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Note: we do NOT stop the mongoServer here.
  // It will be stopped once Jest finishes all tests (or by the OS when the process exits).
  // This prevents "port already in use" or reconnection issues.
};
