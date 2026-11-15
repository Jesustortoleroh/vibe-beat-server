import { GraphQLError } from 'graphql';
import { Request } from 'express';
import mongoose from 'mongoose';
import * as playlistService from '../services/playlist.service';
import * as userService from '../services/user.service';
import { IPlaylist } from '../models/Playlist';

interface GraphQLContext {
  req: Request;
}

export const resolvers = {
  Query: {
    playlists: async () => {
      return await playlistService.getAllPlaylists();
    },
    playlist: async (_: unknown, { id }: { id: string }) => {
      return await playlistService.getPlaylistById(id);
    },
    users: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      // Authentication check
      if (!context.req.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
        });
      }
      // Authorization: only admins can list all users
      if ((context.req.user as { role?: string }).role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } }
        });
      }
      return await userService.getAllUsers();
    },
    user: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      // Users can only query their own profile unless they are admin
      if (!context.req.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
        });
      }
      const currentUser = context.req.user as { id?: string; role?: string };
      if (currentUser.role !== 'admin' && currentUser.id !== id) {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } }
        });
      }
      return await userService.getUserById(id);
    }
  },
  Mutation: {
    createPlaylist: async (_: unknown, { input }: { input: Partial<IPlaylist> }) => {
      // Service whitelists fields; do not instantiate the model directly here
      return await playlistService.createPlaylist(input);
    },
    updatePlaylist: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<IPlaylist> }
    ) => {
      return await playlistService.updatePlaylist(id, input);
    },
    deletePlaylist: async (_: unknown, { id }: { id: string }) => {
      try {
        const deleted = await playlistService.deletePlaylist(id);
        if (!deleted) {
          throw new GraphQLError('Playlist not found', {
            extensions: { code: 'NOT_FOUND', http: { status: 404 } }
          });
        }
        return true;
      } catch (err: unknown) {
        if (err instanceof mongoose.Error.CastError) {
          throw new GraphQLError('Invalid ID format', {
            extensions: { code: 'BAD_USER_INPUT', http: { status: 400 } }
          });
        }
        throw err;
      }
    }
  }
};
