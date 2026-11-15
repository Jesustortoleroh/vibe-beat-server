import dotenv from 'dotenv';
dotenv.config();

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

import db from './models';
import initializePassport from './config/passport';
import routes from './routes';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';

const port: number = parseInt(process.env.PORT || '3000', 10);
const app: Application = express();

// Trust the reverse proxy (Render) to ensure secure cookies are set correctly
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000', 
  'https://vibe-beat-client.onrender.com',
  'https://cse341-music-playlists-client.onrender.com',
];

// Standard middleware
app
  .use(helmet({ contentSecurityPolicy: false }))
  .use(
    cors({
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.onrender.com')) {
          callback(null, true);
        } else {
          console.error(`CORS blocked for origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true
    })
  )
  .use(express.json({ limit: '10kb' }))
  .use(express.urlencoded({ extended: true, limit: '10kb' }))
  .use(
    session({
      secret: process.env.SESSION_SECRET as string,
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI as string,
        ttl: 14 * 24 * 60 * 60
      }),
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
        maxAge: 1000 * 60 * 60 * 24 
      }
    })
  )
  .use(passport.initialize())
  .use(passport.session());

initializePassport(passport);

app.use('/', routes);

export { app };

const httpServer = http.createServer(app);
const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ApolloServerPluginLandingPageLocalDefault({ embed: true })
  ]
});

const startServer = async (): Promise<void> => {
  try {
    if (!db.url) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    await db.mongoose.connect(db.url);
    console.log('MongoDB connected');

    await apolloServer.start();

    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req, res }) => ({ req, res })
      })
    );

    httpServer.listen(port, () => {
      console.log(`DB Connected and server running on port ${port}.`);
      console.log(`API Documentation at http://localhost:${port}/api-docs`);
      console.log(`GraphQL endpoint at http://localhost:${port}/graphql`);
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Cannot connect to the database!', err.message);
    } else {
      console.error('Cannot connect to the database!', err);
    }
    throw err;
  }
};

if (require.main === module) {
  startServer();
}