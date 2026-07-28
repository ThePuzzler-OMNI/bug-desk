# Bug Desk

Multi-site context-rich bug reporting for **members and guests**, with a single steward dashboard.

## Features

- **Report form** — works signed-out (guest) or signed-in (member)
- Auto-captures URL, viewport, UA, timezone, language
- Structured fields: site, type, severity, steps, expected/actual
- **Steward dashboard** — filter member vs guest, site, status, type, severity; search; sort
- Detail panel with full context + status / notes updates
- **Postgres** schema with indexes (`site`, `is_member`, `status`, `severity`, `created_at`)
- PGLite in local/preview; Neon when `DATABASE_URL` is set

## Sites

- One Mission Network
- Intek Space
- Institute of Mature Imagination
- Other / unknown

## Stack

React 19 · TanStack Start · Vite · Tailwind v4 · Better Auth · Postgres / PGLite

## Develop

```bash
npm install
npm run dev   # 0.0.0.0:8080
```

## Deploy (Vercel)

```bash
npm run build   # emits .vercel/output (nitro vercel preset)
```

Import this repo in Vercel. Set `DATABASE_URL` (Neon) for durable production storage.

Optional auth env (platform injects for Grok apps):

- `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET`
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL`

## Routes

| Path | Purpose |
|------|---------|
| `/` | Overview |
| `/report` | File a report |
| `/admin` | Steward dashboard |
| `/login` | Sign in (Google / X) |

## License

Private / One Mission · Intek Inc.

## Deploy (Vercel) — 60 seconds

1. Open [vercel.com/new](https://vercel.com/new) signed into the steward account  
2. **Import** `ThePuzzler-OMNI/bug-desk`  
3. Framework: leave default (Vite / nitro build already configured)  
4. Env (recommended for production durability):  
   - `DATABASE_URL` = Neon Postgres connection string  
   - optional: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, Grok auth client vars  
5. **Deploy** → domain will be `bug-desk.vercel.app` (or custom)  
6. Point custom host if desired (e.g. `bugs.onemissionnetworkandinstitute.org`)

Without `DATABASE_URL` the app still runs (embedded PGLite per instance — fine for demo, not multi-instance durable).

## After deploy

| Action | URL |
|--------|-----|
| File report | `/report` |
| Steward dashboard | `/admin` |
| Sign in (member tag) | `/login` |

Wire the green sitewide **Bug / idea** button to `/report?site=onemission` (or host this app under that path) when you cut over from FormSubmit.
