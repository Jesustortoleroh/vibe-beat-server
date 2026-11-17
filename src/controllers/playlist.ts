import { Request, Response } from 'express';
import mongoose from 'mongoose';
import * as playlistService from '../services/playlist.service';

type AuthenticatedUser = {
  _id?: string | { toString(): string };
  id?: string;
  role?: string;
};

const getUserId = (user: AuthenticatedUser): string | undefined =>
  (typeof user._id === 'string' ? user._id : user._id?.toString()) ?? user.id;

const canManagePlaylist = (user: AuthenticatedUser, creator: string): boolean =>
  user.role === 'admin' || getUserId(user) === creator;

// Centralized error handler for Mongoose and generic errors
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
  console.error(err); // TODO: replace with a proper logger
  const message = err instanceof Error ? err.message : fallbackMessage;
  res.status(500).json({ success: false, message });
};

// GET all playlists
export const getAllPlaylists = async (_req: Request, res: Response): Promise<void> => {
  try {
    const playlists = await playlistService.getAllPlaylists();
    res.status(200).json({ success: true, count: playlists.length, data: playlists });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while retrieving playlists.');
  }
};

// GET playlist by ID
export const getPlaylistById = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const playlist = await playlistService.getPlaylistById(id);
    if (!playlist) {
      res.status(404).json({ success: false, message: 'Playlist not found' });
      return;
    }
    res.status(200).json({ success: true, data: playlist });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while retrieving the playlist.');
  }
};

// POST create new playlist
export const createPlaylist = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user as AuthenticatedUser | undefined;
    const creator = user && getUserId(user);
    if (!creator) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const savedPlaylist = await playlistService.createPlaylist({ ...req.body, creator });
    res.status(201).json({ success: true, data: savedPlaylist });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while creating the playlist.');
  }
};

// PUT update playlist
export const updatePlaylist = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser | undefined;
    const playlist = await playlistService.getPlaylistById(id);
    if (!playlist) {
      res.status(404).json({ success: false, message: 'Playlist not found' });
      return;
    }
    if (!user || !canManagePlaylist(user, playlist.creator)) {
      res.status(403).json({ success: false, message: 'Not authorized to perform this action' });
      return;
    }

    const updatedPlaylist = await playlistService.updatePlaylist(id, req.body);
    if (!updatedPlaylist) {
      res.status(404).json({ success: false, message: 'Playlist not found' });
      return;
    }
    res.status(200).json({ success: true, data: updatedPlaylist });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while updating the playlist.');
  }
};

// DELETE playlist
export const deletePlaylist = async (
  req: Request<{ id: string }>,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user as AuthenticatedUser | undefined;
    const playlist = await playlistService.getPlaylistById(id);
    if (!playlist) {
      res.status(404).json({ success: false, message: 'Playlist not found' });
      return;
    }
    if (!user || !canManagePlaylist(user, playlist.creator)) {
      res.status(403).json({ success: false, message: 'Not authorized to perform this action' });
      return;
    }

    const deletedPlaylist = await playlistService.deletePlaylist(id);
    if (!deletedPlaylist) {
      res.status(404).json({ success: false, message: 'Playlist not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Playlist deleted successfully' });
  } catch (err: unknown) {
    handleError(err, res, 'Some error occurred while deleting the playlist.');
  }
};
