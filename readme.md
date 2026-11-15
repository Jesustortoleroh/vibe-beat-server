# 🎵 Vibe Beat API - TypeScript, GraphQL & REST

REST and GraphQL API for managing music playlists. Vibe Beat Project.

## 📋 Description

This API allows users to manage music playlists. It includes a complete CRUD system with GET, POST, PUT, and DELETE endpoints for both playlists and users. It also features **OAuth 2.0 authentication** (GitHub and Google), data validation, error handling, and auto-generated Swagger documentation. The entire backend is built with **TypeScript** and follows a **Service Layer** architecture. It also includes a **GraphQL** endpoint for flexible data querying.

## 🚀 Technologies

- **Node.js** (v20+) & **Express 5**
- **TypeScript**
- **Apollo Server (GraphQL)**
- **MongoDB** & **Mongoose**
- **Passport.js** (OAuth with GitHub and Google)
- **Swagger** (`swagger-autogen` + `swagger-ui-express`)
- **bcryptjs** (for password hashing)
- **express-validator** (for data validation)
- **Helmet** & **CORS** (for security)
- **dotenv** (for environment variables)
- **Jest**, **Supertest** & **mongodb-memory-server** (for testing)
- **ESLint** & **Prettier** (for code quality)
- **GitHub Actions** (for CI/CD)
- **Docker** & **Docker Compose** (for containerization)

## 🗄️ Database

The project uses **MongoDB Atlas** as the database, connected via Mongoose.

### Collections

| Collection  | Description                             | Fields                                                         |
| :---------- | :-------------------------------------- | :------------------------------------------------------------- |
| `users`     | Stores user accounts (local and OAuth). | name, email, password (hashed), role, provider                 |
| `playlists` | Stores music playlists.                 | name, description, creator, genre, songs, isPublic, coverImage |

## 🏗️ Architecture

The project follows a standard **Service Layer** pattern, separated into `src/` for the application code and `tests/` for integration tests:

- `src/config/`: Database and Passport configuration.
- `src/controllers/`: Handle HTTP requests and responses.
- `src/services/`: Contain all business logic and database queries (reusable by REST and GraphQL).
- `src/models/`: Mongoose schemas and interfaces.
- `src/routes/`: Define API endpoints.
- `src/graphql/`: Apollo Server type definitions and resolvers.
- `src/middlewares/`: Custom authentication and validation middlewares.
- `tests/`: Integration tests using Supertest and in-memory MongoDB.

## 🧪 Testing

The project uses **Jest** and **Supertest** for integration testing. To ensure tests are fast, isolated, and don't pollute your real database, we use **`mongodb-memory-server`**, which spins up an in-memory MongoDB instance during test execution.

### Run Tests

```bash
npm test
```

- **Coverage:** Tests cover User Registration, Playlist CRUD, Auth routes (Passport), and GraphQL queries/mutations.
- **CI/CD:** A GitHub Actions workflow (`.github/workflows/ci.yml`) runs the linter, format check, tests, and build on every push to `main`.

### Other Useful Scripts

- `npm run dev`: Starts the server in development mode with `tsx` and `nodemon`.
- `npm run build`: Compiles the TypeScript code to `dist/` for production.
- `npm run start`: Runs the compiled production build.
- `npm run lint`: Runs ESLint to find code issues.
- `npm run format`: Runs Prettier to automatically format code.
- `npm run swagger`: Generates the `swagger.json` documentation file.

## 🐳 Docker

The project is fully containerized. You can run the API and MongoDB together using Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

### Run with Docker

1. Make sure you have a `.env` file with your environment variables (see below).
2. Build and start the containers:
   ```bash
   docker compose up --build
   ```

## 🔗 Links

- **Repository:** https://github.com/Jesustortoleroh/vibe-beat-server
- **API (Render):** https://vibe-beat-server.onrender.com
- **Swagger docs:** https://vibe-beat-server.onrender.com/api-docs
