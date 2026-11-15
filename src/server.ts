import dotenv from 'dotenv';
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
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { expressMiddleware } from '@as-integrations/express5';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

import db from './models';
import initializePassport from './config/passport';
import routes from './routes';
import { typeDefs } from './graphql/typeDefs';
import { resolvers } from './graphql/resolvers';

type GraphQLContext = {
  req: express.Request;
  res: express.Response;
};

const MONGO_URI = process.env.MONGO_URI;
const SESSION_SECRET = process.env.SESSION_SECRET;
const isTest = process.env.NODE_ENV === 'test';

if (!MONGO_URI || !SESSION_SECRET) {
  throw new Error('MONGO_URI and SESSION_SECRET must be defined');
}

const port = parseInt(process.env.PORT || '3000', 10);
const app: Application = express();

app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173', // <-- Añade esta línea
  'http://localhost:3000',
  'https://vibe-beat-client.onrender.com'
];

initializePassport(passport);

const sessionStore = isTest
  ? new session.MemoryStore()
  : MongoStore.create({ mongoUrl: MONGO_URI, ttl: 14 * 24 * 60 * 60 });

// --- MIDDLEWARES BASE ---
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
      store: sessionStore,
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

// Create Apollo Server factory
export const createApolloServer = (httpServer?: http.Server): ApolloServer<GraphQLContext> => {
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    plugins: [
      ...(httpServer ? [ApolloServerPluginDrainHttpServer({ httpServer })] : []),
      ...(process.env.NODE_ENV !== 'production'
        ? [ApolloServerPluginLandingPageLocalDefault({ embed: true })]
        : [])
    ]
  });
};

// --- PROMESA DE APOLLO PARA TESTS ---
export let apolloReady: Promise<void> = Promise.resolve();

if (isTest) {
  const testApollo = createApolloServer();
  apolloReady = (async () => {
    await testApollo.start();
    // Mount Apollo BEFORE routes so it catches /graphql
    app.use(
      '/graphql',
      expressMiddleware(testApollo, {
        context: async ({ req, res }) => ({ req, res })
      })
    );
  })();
}

// --- MONTAJE DE RUTAS Y 404 ---
// We wait for Apollo before mounting routes ONLY in tests.
const setupRoutes = async () => {
  await apolloReady;
  app.use('/', routes);

  // 404 handler (must be last)
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });
};

// Execute setup asynchronously (Express will use the app once resolved)
setupRoutes();

// Export the app for testing purposes
export { app };

// --- INICIO DEL SERVIDOR REAL ---
const startServer = async (): Promise<void> => {
  try {
    await db.mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, family: 4 });
    console.log('MongoDB connected');

    const httpServer = http.createServer(app);
    const apolloServer = createApolloServer(httpServer);
    await apolloServer.start();

    app.use(
      '/graphql',
      expressMiddleware(apolloServer, {
        context: async ({ req, res }) => ({ req, res })
      })
    );

    httpServer.listen(port, () => {
      console.log(`Server running on port ${port}.`);
    });
  } catch (err) {
    console.error('Cannot start server:', err);
    throw err;
  }
};

if (require.main === module) {
  startServer();
}
