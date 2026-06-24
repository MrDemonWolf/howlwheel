# Howlwheel

A clean, self-hosted **wheel-of-dares spinner** for Twitch streams. An operator
manages wheel slots from a control panel; an OBS browser source renders the wheel
and animates a spin to a chosen or weighted-random result on cue.

Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack):
Next.js (App Router) + Hono on Cloudflare **Workers**, tRPC, Drizzle over **D1**,
Turborepo, deployed with [Alchemy](https://alchemy.run). Same conventions as
`wolfathon` (split public/protected topology, tokenized overlays, shared
`AlertDialog` for destructive confirms). MIT licensed.

## Two surfaces

1. **Control panel** (`/control`) — operator-only, behind **Cloudflare Access**.
   Edit slots (label, weight, colour, enable), drag-reorder, trigger a spin
   (random or pick), see spin history, and grab the tokenized overlay URL.
2. **Overlay widget** (`/overlay?t=<token>`) — public, **token-gated**. An OBS
   browser source that renders the wheel and plays the spin animation, landing on
   the result.

## Architecture

```
┌──────────────────────────────┐     ┌──────────────────────────────┐
│  Web Worker (apps/web)        │     │  Overlay Worker (apps/server)│
│  Next.js                      │     │  Hono                        │
│  • /  /control   (Access)     │     │  • /trpc → publicRouter      │
│  • /overlay      (public)     │     │    (token-gated reads)       │
│  • /api/trpc → protectedRouter│     │                              │
│      (behind Cloudflare Access)│    │  OBS polls here              │
└───────────────┬──────────────┘     └───────────────┬──────────────┘
                └───────────────┬────────────────────┘
                            Cloudflare D1
```

- **Protected** procedures (`slots.*`, `settings.rotateOverlayToken`,
  `spin.trigger`) are served **same-origin** from the web app at `/api/trpc`, so
  the Cloudflare Access cookie + `Cf-Access-Jwt-Assertion` header are always
  present. They're verified in `packages/api/src/access.ts` (JWT via `jose`).
- **Public** procedures (`wheel.getPublic`, `spin.poll`) live on the overlay
  Worker. OBS can't authenticate through Access, so the overlay's auth **is** a
  secret token (`?t=`). Public responses carry render fields only — the token and
  internal ids never leak.

## Data model (`packages/db/src/schema`)

- `slots` — `{ id, order, label, weight, color?, enabled }`
- `spins` — history `{ id, slotId, label, at }`
- `settings` — singleton `{ overlayToken, pendingSpin }`. `overlayToken` is
  lazy-seeded (32-char hex); `pendingSpin` is the JSON channel
  (`{ spinId, targetIndex, at }`) the overlay polls and animates to.

On first run the database lazy-seeds the 2026 wheel-of-dares (10 push-ups, 20
jumping jacks, 1-min dance break, embarrassing story, chat picks next game, chat
picks title 15 min, best villain laugh, draw sona badly 60s, draw chat's request,
free spin). See `packages/api/src/seed.ts`.

### How the spin lands

`spin.trigger` picks the slot (weighted-random server-side, or the given
`slotId`), writes a `spins` row, and sets `pendingSpin` with the **target index**
into the enabled-slots list. The overlay computes the same arcs from
`wheel.getPublic`, then eases a multi-turn rotation to that index using the pure
geometry in `packages/api/src/wheel.ts`. The landing math (`finalRotation` /
`slotIndexAtPointer`) is round-trip tested.

## Local development

```bash
bun install

# Overlay Worker + Next web, both under Alchemy dev (Miniflare D1):
bun dev
#    web    → http://localhost:3001
#    server → http://localhost:3000
```

`alchemy dev` sets `ACCESS_DISABLED=true` automatically, so `/control` is open
locally (a stub `dev@localhost` user). **Access is always enforced on a real
deploy** — it can't be turned off by a stray `.env`.

Open the control panel at `http://localhost:3001/control`, then the **Overlays**
tab to copy the tokenized overlay URL into OBS.

Env templates: `apps/web/.env.example`, `apps/server/.env.example`,
`packages/infra/.env.example`.

## Cloudflare Access

Gate the operator surface so only you can reach it:

1. In the Cloudflare Zero Trust dashboard, create a **Self-hosted Access
   application** covering your web app, scoped to these paths:
   - `/control`
   - `/api/trpc/*`

   Leave `/overlay` and the overlay Worker **public** (OBS uses the token).
2. Add an Access **policy** (e.g. allow your email).
3. Copy the application's **Audience (AUD) tag** and your team domain into the
   deploy env:
   - `CF_ACCESS_TEAM_DOMAIN=yourteam.cloudflareaccess.com`
   - `CF_ACCESS_AUD=<aud tag>`

The web Worker verifies the `Cf-Access-Jwt-Assertion` JWT against
`https://${CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, checking `issuer` and
`audience`. Empty values **fail closed** (everything denied) unless
`ACCESS_DISABLED=true`.

## Overlay token

The overlay is authenticated by a secret token, not Access. From **Control →
Overlays** you get `https://<web>/overlay?t=<token>` and a **Reset** action
(confirmed with the shared `AlertDialog`) that rotates the token. Rotating
invalidates old OBS URLs — re-copy after a reset. The token auto-seeds on first
run; there is no env var for it.

### OBS setup

Add a **Browser Source**:
- URL: the tokenized URL from the Overlays tab
- Width `1920`, Height `1080`
- Background is transparent

## Deploy (Cloudflare via Alchemy)

> Alchemy runs under **Node via `tsx`** — Bun 1.3.x segfaults on the Alchemy
> program (same as wolfathon). The `deploy`/`destroy` scripts already use `tsx`.

```bash
# Fill packages/infra/.env (ALCHEMY_PASSWORD, CLOUDFLARE_API_TOKEN,
# CLOUDFLARE_ACCOUNT_ID, CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD).
bun run deploy     # → howlwheel.mrdemonwolf.workers.dev (web)
                   #   howlwheel-api.mrdemonwolf.workers.dev (overlay API)
bun run destroy    # tear down
```

D1 migrations in `packages/db/src/migrations` are applied automatically on deploy.
Regenerate after a schema change with `bun db:generate`.

## Tests

```bash
cd packages/api && bun test
```

- `wheel.test.ts` — proves the overlay's `finalRotation` lands exactly on the
  server-chosen index for every slot across weighted configs, and the
  weighted-random pick respects weights.
- `routers.test.ts` — proves public procedures never leak the overlay token or
  internal fields, that a wrong/rotated token is rejected, and that
  `spin.trigger`'s `targetIndex` maps to the same slot the overlay renders.

## License

[MIT](./LICENSE) © MrDemonWolf, Inc.
