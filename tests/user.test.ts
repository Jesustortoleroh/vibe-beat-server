import request from 'supertest';
import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import bcrypt from 'bcryptjs';

// Set environment variables BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder';

import { connectDB, closeDB, clearDB } from './setup/dbSetup';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { app } = require('../src/server');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('../src/models').default;

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
  const registerUser = async (userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'StrongP@ss123'
  }) => {
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
    const res = await request(app)
      .post('/api/users')
      .send({
        name: 'Weak Password',
        email: 'weak@example.com',
        password: '123' // Too short, fails isStrongPassword
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });
});