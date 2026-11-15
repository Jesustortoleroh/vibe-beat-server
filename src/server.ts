import dotenv from 'dotenv';

// Only load .env if we are not in a test environment.
// In tests, mongodb-memory-server handles the environment variables.
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

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

const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isTest = process.env.NODE_ENV === 'test';

if (!MONGO_URI || !SESSION_SECRET) {
  throw new Error('MONGO_URI and SESSION_SECRET must be defined in environment variables');
}

const port: number = parseInt(process.env.PORT || '3000', 10);
const app: Application = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://vibe-beat-client.onrender.com'
];

initializePassport(passport);

// Configure session store based on environment
// Use MemoryStore in tests to avoid real database connections
const sessionStore = isTest
  ? new session.MemoryStore()
  : MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 });

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
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: sessionStore, // Use the session store based on the environment
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

app.use('/', routes);

// Export the app for testing purposes
export { app };

const startServer = async (): Promise<void> => {
  try {
    await db.mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      family: 4
    });
    console.log('MongoDB connected');

    db.mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Mongoose will auto-reconnect.');
    });
    db.mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    const httpServer = http.createServer(app);
    const apolloServer = new ApolloServer({
      typeDefs,
      resolvers,
      introspection: process.env.NODE_ENV !== 'production',
      plugins: [
        ApolloServerPluginDrainHttpServer({ httpServer }),
        ...(process.env.NODE_ENV !== 'production'
          ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
          : [])
      ]
    });

    await apolloServer.start();

    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req, res }) => ({ req, res })
      })
    );

    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}.`);
      console.log(`API Documentation at http://localhost:${port}/api-docs`);
      console.log(`GraphQL endpoint at http://localhost:${port}/graphql`);
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Cannot start server:', err.message);
    } else {
      console.error('Cannot start server:', err);
    }
    throw err;
  }
};

if (require.main === module) {
  startServer();
}
