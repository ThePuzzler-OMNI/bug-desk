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
