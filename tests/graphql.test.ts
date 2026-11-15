import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll, jest } from '@jest/globals';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB, clearDB } from './setup/dbSetup';

jest.mock('passport', () => ({
  initialize: () => (req: any, res: any, next: any) => next(),
  session: () => (req: any, res: any, next: any) => {
    req.isAuthenticated = () => req.headers['x-test-authenticated'] === 'true';
    if (req.isAuthenticated()) {
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        id: '507f1f77bcf86cd799439011',
        role: 'user',
        name: 'GraphQL Tester',
        email: 'gql@test.com'
      };
    }
    req.logout = (cb: any) => cb(null);
    next();
  },
  authenticate: (strategy: string) => {
    return (req: any, res: any, next: any) => {
      if (strategy === 'github') return res.redirect('https://github.com/login/oauth/authorize');
      if (strategy === 'google')
        return res.redirect('https://accounts.google.com/o/oauth2/v2/auth');
      next();
    };
  },
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app, apolloReady } = require('../src/server');

beforeAll(async () => {
  await connectDB();
  await apolloReady;
});

afterEach(async () => {
  await clearDB();
});

afterAll(async () => {
  await closeDB();
});

describe('GraphQL API', () => {
  it('should fetch playlists via GraphQL query', async () => {
    const query = `
      query {
        playlists {
          id
          name
        }
      }
    `;

    const res = await request(app).post('/graphql').send({ query });

    expect(res.status).toBe(200);
    expect(res.body.data.playlists).toEqual([]);
  });

  it('should create a playlist via GraphQL mutation when authenticated', async () => {
    const variables = {
      input: {
        name: 'GraphQL Playlist',
        genre: 'POP', // Enums must be uppercase
        isPublic: true
      }
    };

    const res = await request(app)
      .post('/graphql')
      .set('x-test-authenticated', 'true')
      .send({
        query: `
          mutation CreatePlaylist($input: PlaylistInput!) {
            createPlaylist(input: $input) {
              playlist {
                id
                name
                genre
              }
              errors {
                message
                field
              }
            }
          }
        `,
        variables
      });

    if (res.status !== 200 || res.body.errors) {
      console.error('GraphQL Error:', JSON.stringify(res.body, null, 2));
    }

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const payload = res.body.data.createPlaylist;
    expect(payload.errors).toEqual([]);
    expect(payload.playlist.name).toBe('GraphQL Playlist');
    expect(payload.playlist.genre).toBe('POP');
  });
});
