import { GraphQLError } from 'graphql';
import { Request } from 'express';
import mongoose from 'mongoose';
import * as playlistService from '../services/playlist.service';
import * as userService from '../services/user.service';
import { IPlaylist } from '../models/Playlist';

interface GraphQLContext {
  req: Request;
}

type AuthenticatedUser = {
  _id?: string | mongoose.Types.ObjectId;
  id?: string;
  name?: string;
  role?: string;
};

const getCurrentUser = (context: GraphQLContext): AuthenticatedUser | undefined =>
  context.req.user as AuthenticatedUser | undefined;

const getUserId = (user: AuthenticatedUser): string | undefined =>
  (typeof user._id === 'string' ? user._id : user._id?.toString()) ?? user.id;

const requireUser = (context: GraphQLContext): AuthenticatedUser & { id: string } => {
  const user = getCurrentUser(context);
  const id = user && getUserId(user);
  if (!user || !id) {
    throw new GraphQLError('Not authenticated', {
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } }
    });
  }
  return { ...user, id };
};

const canManagePlaylist = (user: AuthenticatedUser, creator: string): boolean =>
  user.role === 'admin' || getUserId(user) === creator;

export const resolvers = {
  // Resolver for the Playlist type to handle relationships and enums
  Playlist: {
    id: (parent: { _id: mongoose.Types.ObjectId }) => parent._id.toString(),
    creator: async (parent: { creator: string | mongoose.Types.ObjectId }) => {
      const creatorId = parent.creator.toString();
      if (mongoose.Types.ObjectId.isValid(creatorId)) {
        const user = await userService.getUserById(creatorId);
        if (user) return user;
      }
      return { id: creatorId, name: creatorId };
    },
    // Map the lowercase value from DB to the uppercase Enum expected by GraphQL
    genre: (parent: { genre: string }) =>
      parent.genre === 'hip-hop' ? 'HIP_HOP' : parent.genre.toUpperCase()
  },

  Query: {
    playlists: async () => {
      return await playlistService.getAllPlaylists();
    },
    playlist: async (_: unknown, { id }: { id: string }) => {
      return await playlistService.getPlaylistById(id);
    },
    users: async (_: unknown, _args: unknown, context: GraphQLContext) => {
      const currentUser = requireUser(context);
      if (currentUser.role !== 'admin') {
        throw new GraphQLError('Not authorized', {
          extensions: { code: 'FORBIDDEN', http: { status: 403 } }
        });
      }
      return await userService.getAllUsers();
    },
    user: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const currentUser = requireUser(context);
      if (currentUser.role !== 'admin' && getUserId(currentUser) !== id) {
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
      const user = requireUser(context);
      try {
        // GraphQL sends uppercase enums (e.g., "POP"), Mongoose expects lowercase ("pop")
        const processedInput = {
          ...input,
          creator: user.id,
          genre: input.genre?.toLowerCase().replace(/_/g, '-')
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
      { id, input }: { id: string; input: Partial<IPlaylist> },
      context: GraphQLContext
    ) => {
      const user = requireUser(context);
      try {
        const existingPlaylist = await playlistService.getPlaylistById(id);
        if (!existingPlaylist) {
          return {
            playlist: null,
            errors: [{ message: 'Playlist not found', field: 'id' }]
          };
        }
        if (!canManagePlaylist(user, existingPlaylist.creator)) {
          throw new GraphQLError('Not authorized', {
            extensions: { code: 'FORBIDDEN', http: { status: 403 } }
          });
        }

        const processedInput = {
          ...input,
          genre: input.genre?.toLowerCase().replace(/_/g, '-')
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
    deletePlaylist: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
      const user = requireUser(context);
      try {
        const existingPlaylist = await playlistService.getPlaylistById(id);
        if (!existingPlaylist) {
          return {
            success: false,
            errors: [{ message: 'Playlist not found', field: 'id' }]
          };
        }
        if (!canManagePlaylist(user, existingPlaylist.creator)) {
          throw new GraphQLError('Not authorized', {
            extensions: { code: 'FORBIDDEN', http: { status: 403 } }
          });
        }

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
