# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## App: TN Politics Tracker (`artifacts/tweet-tracker` → `/`)

Tamil Nadu politics Twitter/X tracking app.

### Pages
- `/` — Dashboard: party activity comparison, top politicians, recent tweets
- `/tracker` — Tweet tracker: manual URL entry, auto-screenshot, party/politician/event tagging, CSV export
- `/politicians` — Politicians directory: name, party, handle, constituency, role, bio
- `/events` — Events & campaigns: tagged tweet counts, date ranges
- `/gallery` — Screenshot gallery
- `/attendance` — UN/meeting attendance & speeches tracker

### DB Tables
- `tweets` — with party_id, politician_id, event_id columns
- `parties` — DMK/TVK/ADMK/BJP/INC/Other (seeded automatically)
- `politicians` — profiles linked to parties
- `events` — political events/campaigns
- `attendance_members` — member names
- `attendance_records` — session attendance

### Auth
- Admin password stored in `ADMIN_PASSWORD` secret
- Frontend stores session in sessionStorage via `AdminContext`
- `requireAdmin` middleware guards DELETE/POST/PUT/PATCH admin routes
- `x-admin-password` header used for all admin requests
