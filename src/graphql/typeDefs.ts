export const typeDefs = `#graphql
  enum Genre {
    ROCK
    POP
    JAZZ
    CLASSICAL
    ELECTRONIC
    HIP_HOP
    REGGAE
    BLUES
    FOLK
    OTHER
  }

  type Playlist {
    id: ID!
    name: String!
    description: String
    creator: User!
    genre: Genre!
    songs: [String!]!
    isPublic: Boolean!
    coverImage: String
    createdAt: String!
    updatedAt: String!
  }

  type User {
    id: ID!
    name: String!
    # email and role are intentionally omitted from the public User type.
    # If needed, expose them via a PrivateUser type with field-level auth.
  }

  type PlaylistError {
    message: String!
    field: String
  }

  type CreatePlaylistPayload {
    playlist: Playlist
    errors: [PlaylistError!]!
  }

  type UpdatePlaylistPayload {
    playlist: Playlist
    errors: [PlaylistError!]!
  }

  type DeletePlaylistPayload {
    success: Boolean!
    errors: [PlaylistError!]!
  }

  input PlaylistInput {
    name: String!
    description: String
    genre: Genre!
    songs: [String!]
    isPublic: Boolean
    coverImage: String
    # creator is derived from the authenticated user, not from input
  }

  input PlaylistUpdateInput {
    name: String
    description: String
    genre: Genre
    songs: [String!]
    isPublic: Boolean
    coverImage: String
  }

  type Query {
    playlists: [Playlist!]!
    playlist(id: ID!): Playlist
    users: [User!]!
    user(id: ID!): User
  }

  type Mutation {
    createPlaylist(input: PlaylistInput!): CreatePlaylistPayload!
    updatePlaylist(id: ID!, input: PlaylistUpdateInput!): UpdatePlaylistPayload!
    deletePlaylist(id: ID!): DeletePlaylistPayload!
  }
`;
