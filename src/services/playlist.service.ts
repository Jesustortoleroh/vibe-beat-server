import db from '../models';
import { IPlaylist } from '../models/Playlist';
import { HydratedDocument } from 'mongoose';

const Playlist = db.Playlist;

// Get all playlists
export const getAllPlaylists = async (): Promise<HydratedDocument<IPlaylist>[]> => {
  return await Playlist.find();
};

// Get playlist by ID
export const getPlaylistById = async (id: string): Promise<HydratedDocument<IPlaylist> | null> => {
  return await Playlist.findById(id);
};

// Create a new playlist
export const createPlaylist = async (
  playlistData: Partial<IPlaylist>
): Promise<HydratedDocument<IPlaylist>> => {
  // Whitelist allowed fields to prevent clients from setting _id, createdAt, etc.
  const playlist = new Playlist({
    name: playlistData.name,
    description: playlistData.description,
    creator: playlistData.creator,
    genre: playlistData.genre,
    songs: playlistData.songs,
    isPublic: playlistData.isPublic,
    coverImage: playlistData.coverImage
  });
  return await playlist.save();
};

// Update a playlist
export const updatePlaylist = async (
  id: string,
  playlistData: Partial<IPlaylist>
): Promise<HydratedDocument<IPlaylist> | null> => {
  // Whitelist allowed fields
  const updateData = {
    name: playlistData.name,
    description: playlistData.description,
    genre: playlistData.genre,
    songs: playlistData.songs,
    isPublic: playlistData.isPublic,
    coverImage: playlistData.coverImage
  };
  // Remove undefined keys so partial updates work correctly
  Object.keys(updateData).forEach(
    (key) =>
      updateData[key as keyof typeof updateData] === undefined &&
      delete updateData[key as keyof typeof updateData]
  );

  return await Playlist.findByIdAndUpdate(id, updateData, {
    returnDocument: 'after', // Mongoose 9: replaces deprecated `new: true`
    runValidators: true
  });
};

// Delete a playlist
export const deletePlaylist = async (id: string): Promise<HydratedDocument<IPlaylist> | null> => {
  return await Playlist.findByIdAndDelete(id);
};
