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
  // Resolver for the Playlist type to handle relationships and enums
  Playlist: {
    id: (parent: { _id: mongoose.Types.ObjectId }) => parent._id.toString(),
    creator: (parent: { creator: string | mongoose.Types.ObjectId }) => {
      // Mock a user object since creator is stored as a string
      if (typeof parent.creator === 'string') {
        return { id: parent.creator, name: parent.creator };
      }
      return { id: parent.creator.toString(), name: 'Unknown User' };
    },
    // Map the lowercase value from DB to the uppercase Enum expected by GraphQL
    genre: (parent: { genre: string }) => parent.genre.toUpperCase()
  },

  Query: {
    playlists: async () => {
      return await playlistService.getAllPlaylists();
    },
    playlist: async (_: unknown, { id }: { id: string }) => {
      return await playlistService.getPlaylistById(id);
    },
    users: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      if (!context.req.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
        });
      }
      if ((context.req.user as { role?: string }).role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } }
        });
      }
      return await userService.getAllUsers();
    },
    user: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
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
    createPlaylist: async (
      _: unknown,
      { input }: { input: Partial<IPlaylist> },
      context: GraphQLContext
    ) => {
      try {
        const creator = input.creator || (context.req.user as any)?.name || 'Unknown';

        // GraphQL sends uppercase enums (e.g., "POP"), Mongoose expects lowercase ("pop")
        const processedInput = {
          ...input,
          creator,
          genre: input.genre?.toLowerCase()
        };

        const playlist = await playlistService.createPlaylist(processedInput);

        return {
          playlist,
          errors: []
        };
      } catch (err: unknown) {
        if (err instanceof mongoose.Error.ValidationError) {
          return {
            playlist: null,
            errors: Object.values(err.errors).map((e) => ({
              message: e.message,
              field: e.path
            }))
          };
        }
        throw err;
      }
    },
    updatePlaylist: async (
      _: unknown,
      { id, input }: { id: string; input: Partial<IPlaylist> }
    ) => {
      try {
        const processedInput = {
          ...input,
          genre: input.genre?.toLowerCase()
        };
        const playlist = await playlistService.updatePlaylist(id, processedInput);

        if (!playlist) {
          return {
            playlist: null,
            errors: [{ message: 'Playlist not found', field: 'id' }]
          };
        }

        return { playlist, errors: [] };
      } catch (err: unknown) {
        if (err instanceof mongoose.Error.ValidationError) {
          return {
            playlist: null,
            errors: Object.values(err.errors).map((e) => ({
              message: e.message,
              field: e.path
            }))
          };
        }
        throw err;
      }
    },
    deletePlaylist: async (_: unknown, { id }: { id: string }) => {
      try {
        const deleted = await playlistService.deletePlaylist(id);
        if (!deleted) {
          return {
            success: false,
            errors: [{ message: 'Playlist not found', field: 'id' }]
          };
        }
        return { success: true, errors: [] };
      } catch (err: unknown) {
        if (err instanceof mongoose.Error.CastError) {
          return {
            success: false,
            errors: [{ message: 'Invalid ID format', field: 'id' }]
          };
        }
        throw err;
      }
    }
  }
};
