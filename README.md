# Story-pix

Multi-tenant SaaS platform for wedding studios and photographers to create interactive WebAR photo albums.

## Project Structure

```
story-pix/
├── frontend/          # React 19 + Vite admin application
├── backend/           # NestJS API server
└── package.json       # Monorepo root (Husky, commitlint)
```

## Prerequisites

- Node.js >= 20
- MongoDB Atlas connection string (or local MongoDB for development)

## Installation

```bash
# Install all dependencies (root + workspaces)
npm install

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Development

```bash
# Run backend and frontend concurrently
npm run dev

# Or run individually
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:5173
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Start NestJS in watch mode |
| `npm run dev:frontend` | Start Vite dev server |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run format` | Format all workspaces |

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for required configuration.

## Branding

Logos and theme tokens live in:

- `frontend/public/brand/` — SVG logos (replace with your brand files if needed)
- `frontend/src/styles/brand.ts` — colors, tagline, asset paths

## Foundation Scope

This repository includes:

- Production-ready authentication (JWT + refresh rotation)
- User, Studio, Role base schemas
- RBAC guards (roles, permissions, tenant)
- Protected routing and layout structure
- Global error handling, validation, logging
- ESLint, Prettier, Husky, commitlint

See `docs/AUTH.md` and `docs/STUDIO_MANAGEMENT.md` for API documentation.

Business modules (albums, WebAR, payments, analytics) are not included yet.
