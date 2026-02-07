# CLAUDE.md — Instructions for Claude Code

## Project: MealFlow

A PWA meal planning app. Read `SCOPE.md` for full product requirements before making architectural decisions.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Cloudflare Workers (API routes)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2 (recipe images)
- **Auth:** Google OAuth 2.0 (whitelist of 2 users)
- **Deployment:** Cloudflare Pages (frontend) + Workers (API)

## Project Structure

```
mealflow/
├── CLAUDE.md
├── SCOPE.md
├── apps/
│   ├── web/                    # Next.js PWA frontend
│   │   ├── app/                # App Router pages and layouts
│   │   ├── components/         # React components
│   │   ├── lib/                # Client utilities, hooks, types
│   │   ├── public/             # Static assets, manifest.json, icons
│   │   └── next.config.js
│   └── api/                    # Cloudflare Workers API
│       ├── src/
│       │   ├── routes/         # Route handlers
│       │   ├── middleware/     # Auth, CORS, etc.
│       │   ├── services/       # Business logic (calendar, recipes, shopping)
│       │   ├── db/             # D1 schema, migrations, queries
│       │   └── index.ts        # Worker entry point
│       └── wrangler.toml
├── packages/
│   └── shared/                 # Shared types and utilities
│       ├── types/              # TypeScript interfaces (Recipe, MealPlan, etc.)
│       └── utils/              # Ingredient normalization, tree nut detection, etc.
└── package.json                # Workspace root
```

## Critical Rules

### Tree Nut Safety
- **NEVER** suggest or include recipes flagged with `contains_tree_nuts = true`
- Tree nut detection runs on every recipe import — see SCOPE.md for the full keyword list
- When in doubt, flag the recipe and let the user override

### Authentication
- Only 2 authorized Google accounts (configured via environment variables)
- Reject all other login attempts with a clear "not authorized" message
- Do not build a registration flow — this is a private family app

### Data Model
- Follow the data model in SCOPE.md exactly. If you need to add fields, add them — don't remove or rename existing ones without discussion.
- Use UUIDs for all primary keys
- Store dates as ISO 8601 strings in D1

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types — use `unknown` and narrow
- Prefer interfaces over type aliases for object shapes
- Export shared types from `packages/shared/types/`

### React / Next.js
- Use Server Components by default; add `"use client"` only when needed
- Colocate component-specific types in the component file
- Use Tailwind for all styling — no CSS modules or styled-components
- Mobile-first responsive design (this will primarily be used on phones)

### API / Workers
- All API routes return JSON with consistent shape: `{ data, error, meta }`
- Validate all inputs at the API boundary (use Zod)
- Never trust client-supplied user IDs — derive from session token

### Database
- Use migrations for all schema changes (numbered: `001_initial.sql`, `002_add_field.sql`, etc.)
- Write raw SQL for D1 queries — no ORM
- Always parameterize queries (no string interpolation)

### Error Handling
- API errors return appropriate HTTP status codes with human-readable messages
- Frontend shows user-friendly error states — never raw error messages or stack traces
- Log errors server-side with enough context to debug

## Development Workflow

### Running Locally
```bash
# Install dependencies
npm install

# Start frontend dev server
cd apps/web && npm run dev

# Start API worker locally
cd apps/api && npx wrangler dev

# Run D1 migrations locally
cd apps/api && npx wrangler d1 execute mealflow-db --local --file=src/db/migrations/001_initial.sql
```

### Environment Variables
```
# apps/api/.dev.vars (local development)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
AUTHORIZED_EMAILS=user1@gmail.com,user2@gmail.com
JWT_SECRET=
R2_BUCKET_NAME=mealflow-images

# Cloudflare Workers secrets (production)
# Set via: npx wrangler secret put <NAME>
```

### Deployment
```bash
# Deploy API
cd apps/api && npx wrangler deploy

# Deploy frontend
cd apps/web && npm run build
# Cloudflare Pages handles deployment via git push
```

## Phase 1 Implementation Order

Build in this order to get something usable as fast as possible:

1. **Project scaffold** — monorepo setup, shared types, basic Next.js app, Worker skeleton
2. **Auth** — Google OAuth flow, session management, email whitelist
3. **Recipe import** — `.paprikarecipes` file upload, parsing, tree nut detection, D1 storage
4. **Recipe browsing** — list/search/filter recipes, view recipe detail
5. **Calendar integration** — Google Calendar API, evening classification, weekly view
6. **Meal planning** — weekly grid, assign recipes to nights, leftover suggestions
7. **Shopping list** — ingredient aggregation, normalization, checklist with real-time sync
8. **Meal prep mode** — prep plan generation from weekly plan
9. **PWA setup** — manifest, service worker, offline shopping list
10. **Polish** — loading states, error handling, mobile UX refinement

## Notes for Claude Code

- When implementing ingredient normalization, consider using an LLM call (Claude API) to parse raw ingredient text into structured data (name, quantity, unit). Rule-based parsing is fragile.
- The `.paprikarecipes` format is a gzip file containing individual `.paprikarecipe` files, each of which is a JSON object. Test with a real export if possible.
- For real-time shopping list sync between 2 users, simple polling (every 5 seconds) is fine for MVP. Don't over-engineer with WebSockets unless polling proves insufficient.
- Cloudflare D1 has a 1MB row limit and 10MB database limit on the free tier. Recipe images should go to R2, not D1.
- The Google Calendar API returns events in the user's timezone — be careful with timezone handling when classifying evenings.
