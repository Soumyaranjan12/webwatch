# WebWatch — real app foundation

This branch starts the production-oriented SvelteKit + TypeScript application while preserving the existing static prototype on `main`.

## Stack

- SvelteKit and Svelte 5
- TypeScript
- Supabase Auth client for email/password sign-up, sign-in, and password reset
- Adapter auto for local development and deployment-target selection

## Local development

Requirements: Node.js 24+ (required by the parcel tracking engine).

```bash
npm install
cp .env.example .env
npm run dev
```

Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` in `.env` using the Supabase project URL and public/publishable anon key. Do not use the service-role key in browser code or any `PUBLIC_` variable.

Check and build:

```bash
npm run check
npm run build
```

Authentication remains in preview mode until valid Supabase credentials and provider settings are configured. Do not merge this branch into the existing GitHub Pages deployment until a proper SvelteKit build/deployment workflow is in place; the current Pages workflow publishes the legacy static prototype.

## Next production milestones

1. Configure Supabase Auth redirect URLs, email verification, reset-password redirects, and Google OAuth.
2. Add server-side session validation and protected account routes.
3. Add database schema and Row Level Security policies for user-owned product watches, price snapshots, parcels, and shipment events.
4. Implement provider adapters for supported retailer and courier sources, with rate limiting, URL/SSRF protections, and background jobs.
5. Add end-to-end tests, deployment configuration, monitoring, backups, and operational documentation.

## Parcel lookup vertical slice

The branch now includes a server-side guest parcel lookup endpoint at `POST /api/parcels/track`, powered by `universal-parcel-scraper`. It returns normalized courier/status/event data from the tracking engine and does not fabricate events. Carrier coverage is not guaranteed; the upstream project scrapes carrier sites, which may rate-limit or block automated requests. No parcel data is persisted yet, and scheduled polling/notifications are not implemented. The endpoint includes a basic in-memory per-IP rate limit; production deployment needs shared rate limiting and operational monitoring.
