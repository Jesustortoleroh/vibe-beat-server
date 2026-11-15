import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB } from './setup/dbSetup';

// ✅ Mock Passport's methods to simulate session states and OAuth redirects
jest.mock('passport', () => ({
  initialize: () => (req: any, res: any, next: any) => next(),
  session: () => (req: any, res: any, next: any) => {
    // Mock req.isAuthenticated based on a custom header
    req.isAuthenticated = () => req.headers['x-test-authenticated'] === 'true';

    // ✅ If authenticated, inject a fake user into the request
    if (req.isAuthenticated()) {
      req.user = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      };
    }

    // Mock req.logout
    req.logout = (cb: any) => cb(null);
    next();
  },
  authenticate: (strategy: string) => {
    return (req: any, res: any, next: any) => {
      if (strategy === 'github') {
        return res.redirect('https://github.com/login/oauth/authorize');
      }
      if (strategy === 'google') {
        return res.redirect('https://accounts.google.com/o/oauth2/v2/auth');
      }
      next();
    };
  },
  use: jest.fn(),
  serializeUser: jest.fn(),
  deserializeUser: jest.fn()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../src/server');

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await closeDB();
});

describe('Auth Routes', () => {
  it('should redirect to GitHub for OAuth login', async () => {
    const res = await request(app).get('/auth/github');
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('github.com');
  });

  it('should redirect to Google for OAuth login', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.header.location).toContain('google.com');
  });

  it('should return 401 on /auth/profile if not authenticated', async () => {
    const res = await request(app).get('/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authenticated');
  });

  it('should return user profile if authenticated', async () => {
    const res = await request(app).get('/auth/profile').set('x-test-authenticated', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.name).toBe('Test User');
  });

  it('should logout successfully', async () => {
    const res = await request(app).post('/auth/logout').set('x-test-authenticated', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('Logged out');
  });
});
