import db from '../models';
import { IUser } from '../models/User';
import { HydratedDocument } from 'mongoose';

const User = db.User;

// Get all users (password excluded by schema `select: false`)
export const getAllUsers = async (): Promise<HydratedDocument<IUser>[]> => {
  return await User.find();
};

// Get user by ID (password excluded by schema `select: false`)
export const getUserById = async (id: string): Promise<HydratedDocument<IUser> | null> => {
  return await User.findById(id);
};

// Create a new user (whitelist fields; never trust client-provided role/provider)
export const createUser = async (
  userData: Pick<IUser, 'name' | 'email' | 'password'>
): Promise<Partial<IUser>> => {
  const user = new User({
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: 'user', // Force default; never trust client
    provider: 'local' // Force local provider for self-registration
  });
  const savedUser = await user.save();

  // Return without password
  const userResponse = savedUser.toObject();
  delete userResponse.password;
  return userResponse;
};

// Update a user (whitelist allowed fields; never allow role/provider changes here)
export const updateUser = async (
  id: string,
  userData: Pick<IUser, 'name' | 'email' | 'password'>
): Promise<Partial<IUser> | null> => {
  const user = await User.findById(id);
  if (!user) return null;

  if (userData.name !== undefined) user.name = userData.name;
  if (userData.email !== undefined) user.email = userData.email;
  if (userData.password !== undefined) user.password = userData.password;

  const updatedUser = await user.save();
  const userResponse = updatedUser.toObject();
  delete userResponse.password;
  return userResponse;
};

// Delete a user
export const deleteUser = async (id: string): Promise<HydratedDocument<IUser> | null> => {
  return await User.findByIdAndDelete(id);
};

// Find or create a user from OAuth login
export const findOrCreateOAuthUser = async (
  profile: { email: string; name: string },
  provider: 'github' | 'google'
): Promise<HydratedDocument<IUser> | null> => {
  const currentUser = await User.findOne({ email: profile.email });
  if (currentUser) {
    return currentUser.provider === provider ? currentUser : null;
  }

  const newUser = new User({
    name: profile.name,
    email: profile.email,
    provider,
    role: 'user'
  });

  await newUser.save();
  return newUser;
};

// Find user by ID for Passport deserialization (password excluded by schema `select: false`)
export const getUserByIdForAuth = async (id: string): Promise<HydratedDocument<IUser> | null> => {
  return await User.findById(id);
};
