# Domino Art PWA

Multi-tenant Progressive Web App for planning domino art projects from images.

## Stack

- **Client**: Vue 3, Vuetify, Vite, Pinia, Three.js, PWA
- **Server**: Express 5, Drizzle ORM, PostgreSQL
- **Shared**: Color matching (CIELAB), setup lists, build instructions, floor plan helpers

## Features

- Field Planner: image → grid → domino color match → setup list → build instructions
- Wall Planner: brick-style domino walls with inventory counts
- Floor Plan: physical-scale layout with structure generators
- Demo mode: try the Field Planner without an account (IndexedDB)
- Auth + workspaces + color inventory
- Share links, JSON export/import
- 3D preview with topple interaction
- Social: public plans, artist profiles, follow, discover gallery

## Getting started

Uses a **locally installed PostgreSQL** database. Docker is optional (see `docker-compose.yml` only if you prefer a containerized Postgres).

```bash
# Create a database (psql or your GUI)
# CREATE DATABASE domino_art;

# Install dependencies
npm install

# Configure environment — set DATABASE_URL to your local Postgres
cp .env.example server/.env
# e.g. postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/domino_art

# Build shared package, run migrations
npm run build -w shared
npm run db:migrate -w server

# Run dev servers (API :3001, client :5173)
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + client |
| `npm run build` | Build all packages |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:seed` | Seed default domino palette |
| `npm test` | Run shared/client tests |

## Project structure

```
domino-art/
├── client/          Vue PWA
├── server/          Express API
├── shared/          Shared types + algorithms
└── docker-compose.yml   # optional; local Postgres is the default
```

## MVP flow

1. Visit `/` — upload an image, set grid size, generate domino plan (demo mode)
2. Sign up to save projects and customize your color inventory
3. Export setup lists, build instructions (CSV/PDF), or share via link
