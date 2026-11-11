# NEXORA — Intelligent Student Workspace

NEXORA is a full-stack study workspace for organizing tasks, keeping private class notes, discovering learning resources, and protecting focused time. The existing Vite starter in `client/` has been extended into a React + TypeScript application, backed by an Express API and Supabase PostgreSQL.

Demo : https://nexora-alpha-ashen-43.vercel.app?utm_source=chatgpt.com

> **Database/auth assignment substitution:** The assignment describes MongoDB/Mongoose and bcrypt. This project intentionally uses **Supabase PostgreSQL and Supabase Auth** instead. Passwords are handled by Supabase Auth; they are never stored in NEXORA tables. No MongoDB, Mongoose, or bcrypt implementation is claimed.

## Features

- Responsive marketing landing page, registration, and sign-in using Supabase email/password Auth.
- Authenticated React Router workspace with dashboard, tasks, notes, resources, focus timer, and settings.
- Task CRUD with priority/category/due date/status, completion, search, filters, sorting, and list/board views.
- Private notes CRUD with explicit save, category, search, and pinning.
- Dashboard totals and weekly chart derived from the signed-in user's database records. API/database errors are shown rather than replaced with sample analytics.
- Curated resource cards with typed React props and state-based category/favorite selection. Favorites are session-only.
- Focus/break timer with interval cleanup; focus history is not persisted.
- Express JSON REST API, Zod request validation, centralized errors, Supabase Auth token verification, and per-user filtering/RLS.
- Version-controlled SQL migration and an importable Postman collection.

## Technology

| Area | Stack |
|---|---|
| Client | React, TypeScript, Vite, React Router, CSS Modules, Framer Motion, Lucide React, Recharts |
| API | Node.js, Express, TypeScript, Zod |
| Auth/data | Supabase Auth JWTs, Supabase PostgreSQL, Row Level Security |
| Testing / deployment | Node test runner, Postman, Vercel-ready client, Render-ready API |

## Project structure

```text
client/                       React + Vite application
  src/components/             Shared UI and typed ProductCard
  src/contexts/               Supabase auth session context
  src/layouts/                Responsive authenticated workspace shell
  src/pages/                  Landing, auth, dashboard, tasks, notes, etc.
  src/services/               Supabase and Express API clients
  src/styles/                 Global design tokens
  src/types/                  Shared client models
server/                       Express API
  src/                        Routes, auth middleware, validation schemas
  scripts/                    Controlled demo seed/cleanup utility
  test/                       Backend validation and demo-seed safety tests
supabase/migrations/          SQL schema, triggers, indexes, RLS policies
postman/                      Importable REST API collection
```

## Local setup

Requirements: Node.js 20.19+ (Node 24 recommended), npm, and a Supabase project.

1. **Configure Supabase.** Create or select a project. Use its project URL and publishable key (legacy projects may label this the `anon` key). The frontend and API use only the publishable/anon key; never put a `service_role` key in frontend code or normal API configuration.
2. **Apply migrations deliberately and in order.** Review the live schema and Supabase migration history first. If the base schema is not already present, apply `supabase/migrations/20261110000000_initial_schema.sql`. To use the optional controlled demo utility, separately review and apply `supabase/migrations/20261111000100_demo_seed_tracking.sql`. These files are not automatically applied by the app. Do not rerun non-idempotent migrations against a project where their objects already exist.
3. **Create private local environment files** from the safe templates:

   ```powershell
   Copy-Item client\.env.example client\.env.local
   Copy-Item server\.env.example server\.env
   ```

   Set these variable names in `client/.env.local`:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_BASE_URL`

   Set these variable names in `server/.env`:

   - `PORT`
   - `CLIENT_ORIGIN`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

   The demo utility additionally uses `SUPABASE_SERVICE_ROLE_KEY` and, for seeding only, `DEMO_ACCOUNT_PASSWORD`. These are not required by the frontend or normal API runtime.

   The `.env.example` files are templates only. Keep real values in ignored local files or your deployment secret manager; do not commit credentials, access tokens, passwords, database URLs containing credentials, or service-role keys.
4. **Install dependencies and run both services** in separate terminals:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

   ```powershell
   cd server
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Supabase Auth email confirmation settings are controlled in the Supabase dashboard. If confirmation is enabled, verify the registration email before signing in.

## Controlled demo data

The optional demo utility is separate from application startup. It targets only five fictional `@nexora-demo.invalid` accounts and their expected 25 tasks and 15 notes. Durable ownership is recorded in `nexora_demo_seed_records`; the RPCs in the tracking migration reject unowned ID collisions or changed data. Cleanup deletes only unchanged, tracked task/note records and never deletes Auth users or profiles.

Before any use, review the target project and migration history, apply `supabase/migrations/20261111000100_demo_seed_tracking.sql` deliberately if it is not already applied, and run the read-only preview. From `server/`:

```powershell
npm run seed:demo -- --dry-run --confirm-demo-scope=NEXORA-5-STUDENTS
```

The preview requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server-only local environment, but no demo password. It performs reads only and reports planned account/profile/record counts and conflicts. `SUPABASE_SERVICE_ROLE_KEY` is highly privileged: use it only in this isolated server-side utility, never in the frontend or normal API service, and never print or commit it.

Only after reviewing the preview and separately approving account creation, a maintainer may seed:

```powershell
npm run seed:demo -- --seed --confirm-demo-scope=NEXORA-5-STUDENTS
```

The seed also requires `DEMO_ACCOUNT_PASSWORD` set privately in the process environment; use a strong password and do not place it in source control, command history, or logs. Seeding can create Auth accounts, profiles, tasks, and notes. Do not run it against production without explicit approval. Any ownership or identity conflict stops the operation before records are changed. Do not run cleanup casually: while it preserves all Auth users and profiles, it deletes unchanged demo task/note rows in the durable ledger. Preview cleanup first:

```powershell
npm run seed:demo -- --cleanup --dry-run --confirm-demo-scope=NEXORA-5-STUDENTS
```

The cleanup command requires the same scope confirmation. The fixed due-date schedule keeps repeat runs deterministic.

## API

Base URL defaults to `http://localhost:3001`. All responses use JSON. Successful endpoints wrap payloads in `{ "data": ... }`; errors return `{ "error": "...", "details"?: [...] }`.

| Method | Path | Auth | Result |
|---|---|---:|---|
| GET | `/api/health` | No | API status and whether Supabase env values are configured |
| GET | `/api/me` | Yes | Verified user ID/email and profile |
| GET / POST | `/api/tasks` | Yes | List tasks / create task (201) |
| PATCH / DELETE | `/api/tasks/:id` | Yes | Update or delete an owned task |
| GET / POST | `/api/notes` | Yes | List notes / create note (201) |
| PATCH / DELETE | `/api/notes/:id` | Yes | Update or delete an owned note |

Protected requests require `Authorization: Bearer <Supabase access token>`. The API validates the token with Supabase Auth `getUser(token)`, uses only the Supabase publishable/anon key, derives the owner from the verified user, and sends that JWT to PostgREST so RLS remains active. `user_id` is not accepted from request bodies. CRUD is constrained by both owner filters and RLS policies.

Example:

```http
POST /api/tasks
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "title": "Review lecture notes",
  "description": "Summarize the key ideas",
  "priority": "medium",
  "category": "Biology",
  "due_date": null
}
```

### Postman

Import `postman/NEXORA.postman_collection.json`. Set collection variables:

- `base_url` — API URL (local default is already set).
- `access_token` — an access token from a signed-in Supabase Auth session.
- `task_id` / `note_id` — IDs returned by the corresponding create requests.

The collection includes health, identity, task/note CRUD, and an invalid-payload validation request. Supply credentials only in a local Postman environment; never save a real access token in this collection or commit one.

## Build, tests, and deployment

```powershell
cd client
npm run build
npm run lint
```

```powershell
cd server
npm test
npm run typecheck
npm run build
```

**Vercel client:** Set the root/build directory to `client`, build command to `npm run build`, output directory to `dist`, and configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_API_BASE_URL`. `client/vercel.json` configures the SPA rewrite for React Router routes.

**Render API:** `render.yaml` describes the web service rooted at `server`, its build/start commands, health check, and required environment variables. Set `CLIENT_ORIGIN` to the deployed client origin, and supply `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Render. Render supplies `PORT`. Configure the deployed API URL as the client's `VITE_API_BASE_URL`.

## Screenshots

No application screenshots are currently included. Add reviewed, credential-free screenshots here if they are prepared for publication.

## Assignment requirements mapping and technology deviation

| Requirement | NEXORA implementation |
|---|---|
| Reusable product information component | `ProductCard` component uses typed product props on the Resource Showcase page |
| React props and state | Typed product props; favorites/category/search state |
| To-do add/delete | Task create/delete in Task Manager; delete confirmation |
| React Router multi-page navigation | Landing/auth routes and nested protected workspace routes |
| CSS Modules | Component and page styles use `.module.css`; global tokens in `client/src/styles/tokens.css` |
| Node.js and Express backend | TypeScript Express API in `server/src` |
| REST task CRUD | Protected `/api/tasks` endpoints |
| Registration and login with JWT authentication | Supabase email/password Auth issues JWT access tokens; API verifies them with Supabase Auth |
| Notes CRUD with protected routes | Protected `/api/notes` endpoints and private Notes Studio |
| Postman-ready API testing | `postman/NEXORA.postman_collection.json` and API examples above |
| MongoDB/Mongoose and bcrypt in assignment PDF | Replaced with Supabase PostgreSQL and Supabase Auth as requested; MongoDB/Mongoose/bcrypt are not implemented |

**Important submission disclosure:** NEXORA implements the React/TypeScript frontend, Express REST API, authenticated tasks and notes, dashboard, resources, and focus timer described above. The assignment's MongoDB/Mongoose and bcrypt requirement is **not implemented**: this project uses Supabase PostgreSQL with SQL migrations, Supabase Auth, JWT verification, and PostgreSQL Row Level Security instead. Password handling belongs to Supabase Auth; the application does not implement bcrypt or store user passwords in its own tables. This is a material technology substitution and should be disclosed rather than represented as MongoDB/Mongoose compliance.

Any manual end-to-end QA claims should be attributed to the actual test run and environment; successful local lint/build/unit tests do not independently prove live Supabase schema state, RLS configuration, or deployed behavior.
