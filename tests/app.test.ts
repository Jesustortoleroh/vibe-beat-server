import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// ✅ Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB } from './setup/dbSetup';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../src/server');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

describe('API Basic Tests', () => {
  it('should return 200 OK on the root route', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Welcome');
  });

  it('should return 401 Unauthorized when trying to create a playlist without login', async () => {
    const res = await request(app)
      .post('/api/playlists')
      .send({ name: 'Test Playlist', creator: 'Test', genre: 'rock' });
    expect(res.status).toBe(401);
  });
});
