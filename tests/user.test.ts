import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll, jest } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB, clearDB } from './setup/dbSetup';

jest.mock('../src/middlewares/auth', () => ({
  ensureAuthenticated: (req: any, res: any, next: any) => {
    req.user = {
      _id: req.headers['x-test-user-id'] || '507f1f77bcf86cd799439011',
      role: 'user'
    };
    next();
  },
  ensureAdmin: (req: any, res: any, next: any) => next()
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../src/server');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../src/models').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const userService = require('../src/services/user.service');

beforeAll(async () => {
  await connectDB();
});

afterEach(async () => {
  await clearDB(); // Cleans the DB between tests
});

afterAll(async () => {
  await closeDB();
});

describe('POST /api/users (User Registration)', () => {
  // Helper function to register a user directly via HTTP
  const registerUser = async (
    userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'StrongP@ss123'
    }
  ) => {
    return await request(app).post('/api/users').send(userData);
  };

  it('should register a new user successfully', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('_id');
    expect(res.body.data.email).toBe('test@example.com');
    expect(res.body.data.name).toBe('Test User');
    expect(res.body.data).not.toHaveProperty('password');
  });

  it('should hash the password before saving to the database', async () => {
    // Create the user for this specific test
    await registerUser();

    const userInDb = await db.User.findOne({ email: 'test@example.com' }).select('+password');

    expect(userInDb).toBeDefined();
    expect(userInDb!.password).toBeDefined();
    expect(userInDb!.password).not.toBe('StrongP@ss123');

    const isMatch = await bcrypt.compare('StrongP@ss123', userInDb!.password!);
    expect(isMatch).toBe(true);
  });

  it('should assign the default role "user"', async () => {
    // Create the user for this specific test
    await registerUser();

    const userInDb = await db.User.findOne({ email: 'test@example.com' });

    expect(userInDb).toBeDefined();
    expect(userInDb!.role).toBe('user');
  });

  it('should return 409 Conflict if email already exists', async () => {
    // Register the user once
    await registerUser();

    // Try to register the exact same user again
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('exists');
  });

  it('should return 400 Bad Request for invalid input (weak password)', async () => {
    const res = await request(app).post('/api/users').send({
      name: 'Weak Password',
      email: 'weak@example.com',
      password: '123' // Too short, fails isStrongPassword
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should hash a password changed by the account owner', async () => {
    const registered = await registerUser();
    const res = await request(app)
      .put(`/api/users/${registered.body.data._id}`)
      .set('x-test-user-id', registered.body.data._id)
      .send({ password: 'NewStrongP@ss123' });

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password');
    const userInDb = await db.User.findById(registered.body.data._id).select('+password');
    expect(userInDb!.password).not.toBe('NewStrongP@ss123');
    expect(await bcrypt.compare('NewStrongP@ss123', userInDb!.password!)).toBe(true);
  });

  it('should not expose another user by ID', async () => {
    const registered = await registerUser();
    const res = await request(app)
      .get(`/api/users/${registered.body.data._id}`)
      .set('x-test-user-id', '507f191e810c19729de860ea');

    expect(res.status).toBe(403);
  });

  it('should not link an existing local account to OAuth implicitly', async () => {
    await registerUser();
    const user = await userService.findOrCreateOAuthUser(
      { name: 'OAuth User', email: 'test@example.com' },
      'google'
    );

    expect(user).toBeNull();
  });
});
