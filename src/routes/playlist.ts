import express, { Router } from 'express';
import * as playlistController from '../controllers/playlist';
import { ensureAuthenticated } from '../middlewares/auth';
import { playlistCreateRules, playlistUpdateRules, validate } from '../middlewares/validation';

const router: Router = express.Router();

// GET all playlists
router.get('/', playlistController.getAllPlaylists);
// #swagger.tags = ['Playlists']
// #swagger.summary = 'Get all playlists'

// POST create new playlist
router.post(
  '/',
  ensureAuthenticated,
  playlistCreateRules, // ✅ Restaurado: aplica las reglas de creación
  validate,
  playlistController.createPlaylist
);
// #swagger.tags = ['Playlists']
// #swagger.summary = 'Create a new playlist'
// #swagger.parameters['body'] = {
//   in: 'body',
//   description: 'Playlist data',
//   required: true,
//   schema: { $ref: '#/definitions/PlaylistInput' }
// }

// GET playlist by ID
router.get('/:id', playlistController.getPlaylistById);
// #swagger.tags = ['Playlists']
// #swagger.summary = 'Get playlist by ID'
// #swagger.parameters['id'] = { description: 'Playlist ID' }

// PUT update playlist
router.put(
  '/:id',
  ensureAuthenticated,
  playlistUpdateRules, // ✅ Restaurado: aplica las reglas de actualización (campos opcionales)
  validate,
  playlistController.updatePlaylist
);
// #swagger.tags = ['Playlists']
// #swagger.summary = 'Update a playlist'
// #swagger.parameters['id'] = { description: 'Playlist ID' }

// DELETE playlist
router.delete('/:id', ensureAuthenticated, playlistController.deletePlaylist);
// #swagger.tags = ['Playlists']
// #swagger.summary = 'Delete a playlist'
// #swagger.parameters['id'] = { description: 'Playlist ID' }

export default router;
