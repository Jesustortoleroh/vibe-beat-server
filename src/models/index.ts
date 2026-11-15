import mongoose from 'mongoose';
import dbConfig from '../config/db.config';
import createUserModel from './User';
import createPlaylistModel from './Playlist';

const db = {
  mongoose,
  // Lazy getter: reflects changes to process.env.MONGO_URI (useful for tests)
  get url() {
    return dbConfig.url;
  },
  User: createUserModel(mongoose),
  Playlist: createPlaylistModel(mongoose)
};

export default db;
