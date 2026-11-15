import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as userService from '../services/user.service';

// Centralized error handler (consider moving to utils/errorHandler.ts)
const handleError = (err: unknown, res: Response, fallbackMessage: string): void => {
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({ success: false, message: 'Invalid ID format.' });
    return;
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const messages = Object.values(err.errors).map((e) => e.message);
    res.status(400).json({ success: false, message: messages.join(', ') });
    return;
  }
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? 'field';
    res.status(409).json({ success: false, message: `${field} already exists` });
    return;
  }
  console.error(err); // TODO: replace with a proper logger
  const message = err instanceof Error ? err.message : fallbackMessage;
  res.status(500).json({ success: false, message });
};

// POST create new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userResponse = await userService.createUser(req.body);
    res.status(201).json({ success: true, message: 'User created', data: userResponse });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while creating the user.');
  }
};

// GET all users
export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await userService.getAllUsers();
    res.status(200).json({ success: true, count: data.length, data });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while retrieving users.');
  }
};

// GET user by ID
export const getUserById = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await userService.getUserById(id);
    if (!data) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while retrieving the user.');
  }
};

// PUT update user
export const updateUser = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await userService.updateUser(id, req.body);
    if (!data) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, data });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while updating the user.');
  }
};

// DELETE user
export const deleteUser = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const data = await userService.deleteUser(id);
    if (!data) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while deleting the user.');
  }
};
