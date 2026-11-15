import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll, jest } from '@jest/globals';

// Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB, clearDB } from './setup/dbSetup';

// ✅ Mock the auth middleware so we can test protected routes
jest.mock('../src/middlewares/auth', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    // Inject a fake user into the request to simulate a logged-in user
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'user' };
    next();
  },
  ensureAdmin: (req: any, res: any, next: any) => next()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../src/server');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../src/models').default;

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});

describe('Playlist API', () => {
  const validPlaylist = {
    name: 'My Awesome Playlist',
    description: 'A great mix of songs',
    creator: 'Test User',
    genre: 'rock',
    songs: ['Song 1', 'Song 2'],
    isPublic: true
  };

  describe('GET /api/playlists', () => {
    it('should return an empty array when no playlists exist', async () => {
      const res = await request(app).get('/api/playlists');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('POST /api/playlists', () => {
    it('should create a playlist successfully when authenticated', async () => {
      const res = await request(app).post('/api/playlists').send(validPlaylist);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe(validPlaylist.name);
      expect(res.body.data.genre).toBe(validPlaylist.genre);
    });

    it('should save the playlist to the database', async () => {
      await request(app).post('/api/playlists').send(validPlaylist);

      const playlistInDb = await db.Playlist.findOne({ name: validPlaylist.name });

      expect(playlistInDb).toBeDefined();
      expect(playlistInDb!.creator).toBe(validPlaylist.creator);
    });

    it('should return 400 Bad Request for invalid data (missing name)', async () => {
      const invalidPlaylist = {
        creator: 'Test User',
        genre: 'rock'
        // Missing name
      };

      const res = await request(app).post('/api/playlists').send(invalidPlaylist);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should return 400 Bad Request for invalid genre', async () => {
      const invalidGenrePlaylist = {
        ...validPlaylist,
        genre: 'invalid-genre'
      };

      const res = await request(app).post('/api/playlists').send(invalidGenrePlaylist);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
