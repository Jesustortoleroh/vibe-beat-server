import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll, jest } from '@jest/globals';

// Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB, clearDB } from './setup/dbSetup';

// Mock the auth middleware so we can test protected routes
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

  // Helper function to create a playlist and return it
  const createTestPlaylist = async (data = validPlaylist) => {
    const res = await request(app).post('/api/playlists').send(data);
    return res.body.data;
  };

  describe('GET /api/playlists', () => {
    it('should return an empty array when no playlists exist', async () => {
      const res = await request(app).get('/api/playlists');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('should return a list of playlists', async () => {
      await createTestPlaylist();
      const res = await request(app).get('/api/playlists');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe(validPlaylist.name);
    });
  });

  describe('GET /api/playlists/:id', () => {
    it('should return a single playlist by ID', async () => {
      const created = await createTestPlaylist();

      const res = await request(app).get(`/api/playlists/${created._id}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(validPlaylist.name);
    });

    it('should return 404 if playlist not found', async () => {
      // Use a valid but non-existent ObjectId
      const res = await request(app).get('/api/playlists/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/playlists', () => {
    it('should create a playlist successfully when authenticated', async () => {
      const res = await request(app).post('/api/playlists').send(validPlaylist);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.name).toBe(validPlaylist.name);
    });

    it('should return 400 Bad Request for invalid data (missing name)', async () => {
      const invalidPlaylist = { creator: 'Test User', genre: 'rock' }; // Missing name
      const res = await request(app).post('/api/playlists').send(invalidPlaylist);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/playlists/:id', () => {
    it('should update a playlist successfully', async () => {
      const created = await createTestPlaylist();

      const updateData = {
        name: 'Updated Playlist Name',
        genre: 'pop'
      };

      const res = await request(app).put(`/api/playlists/${created._id}`).send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(updateData.name);
      expect(res.body.data.genre).toBe(updateData.genre);
    });

    it('should return 404 if playlist to update is not found', async () => {
      const res = await request(app)
        .put('/api/playlists/507f1f77bcf86cd799439011')
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid update data', async () => {
      const created = await createTestPlaylist();

      const res = await request(app)
        .put(`/api/playlists/${created._id}`)
        .send({ genre: 'invalid-genre' }); // Invalid genre

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/playlists/:id', () => {
    it('should delete a playlist successfully', async () => {
      const created = await createTestPlaylist();

      const res = await request(app).delete(`/api/playlists/${created._id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted');

      // Verify it's actually gone from DB
      const playlistInDb = await db.Playlist.findById(created._id);
      expect(playlistInDb).toBeNull();
    });

    it('should return 404 if playlist to delete is not found', async () => {
      const res = await request(app).delete('/api/playlists/507f1f77bcf86cd799439011');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
