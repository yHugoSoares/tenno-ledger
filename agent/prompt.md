# Project: Tenno Ledger, a public Warframe mastery tracker

## 1. What we are building and why
A free, open-source website where any Warframe player can see their Mastery Rank progress on a polished profile page, similar in spirit to SkyCrypt (sky.shiiyu.moe) for Hypixel SkyBlock. The player supplies their public profile data. The site shows what is mastered, what is missing, how many Mastery points they have, and what to level next.

It is an unofficial fan project, not affiliated with Digital Extremes (DE). It must say so in the footer and on an About page.

## 2. Non-negotiable constraints (read before designing anything)
These exist because of how DE's profile endpoint behaves. Do not work around them.

1. **No server-side calls to DE.** DE's profile endpoint throttles by IP address, and the game client uses the same endpoint. If my VPS called it for many users, its IP would be blocked quickly, and a blocked address can even stop real players logging in. Therefore the site never proxies, relays or caches `api.warframe.com` requests on my server.
2. **Profile data enters the app in one of two ways, both on the visitor's own machine:**
   - a) The user pastes the profile JSON into a textarea (always available, always works).
   - b) An optional "Fetch from my browser" button calls `https://api.warframe.com/cdn/getProfileViewingData.php?playerId=<ID>` directly from the visitor's browser. This may be blocked by CORS. Wrap it in try/catch, and on failure show a clear message pointing to option (a). Read the body as text, then JSON.parse (the content type may not be JSON).
3. **ID safety.** The player ID is a 24-character hexadecimal string (the `gid` cookie on warframe.com). Validate the format before any request. Wrong IDs cause throttling, so reject bad input locally.
4. **Rate-limit politeness.** Cache the profile in localStorage and refuse to refetch for 12 hours. Show a cooldown on the button. Handle these cases clearly: success, "account not found" (HTTP 409 with a message), throttled (empty 409, 403 or 429, so tell the user to wait and do not retry automatically), and other upstream errors.
5. **Privacy.** Everything stays in the browser. No analytics, no accounts, no database. Never ask for any cookie except `gid`, and warn users prominently never to share other cookies (login tokens such as session, remember-me and XSRF cookies).

## 3. Data sources
- **Item database:** WFCD `warframe-items` (`.../data/json/All.json`). Use only items where `masterable === true`. Before writing code, inspect the real field names (`uniqueName`, `name`, `category`, `type`, `masteryReq`, `imageName`) and report them. Do not assume.
- **Profile JSON:** the response is expected under `Results[0]`. Find the `XPInfo` array (`{ItemType, XP}`) recursively, because the exact nesting may differ. If it is missing, show the top-level keys in the error so the parser can be adjusted. Trim the profile to the fields you use before caching it.
- Verify every assumption above against a real sample before building features on it.

## 4. Mastery rules
- Total points needed for rank N: 2500 × N² (MR18 = 810,000).
- Weapons: 3,000 points at rank 30 (450,000 XP).
- Warframes, companions (Sentinels, Kubrows, Kavats, Vulpaphylas, Predasites, MOAs, Hounds), Archwings, Necramechs: 6,000 points at rank 30 (900,000 XP).
- Kuva, Tenet, Coda and Paracesis items can go to rank 40 in-game, but points are earned by rank 30. Model this explicitly.
- Each item counts once, and variants (Prime, Wraith, Vandal, Prisma) count separately.
- Junctions: 1,000 points each. Intrinsic ranks: 1,500 each. Star Chart nodes: a small amount each (do not hardcode a number unless verified). The profile may not contain these, so provide manual inputs, stored locally.

## 5. Features
1. **Landing page:** hero, one input (ID or paste JSON), "Try demo profile" button, and a collapsible guide on finding the `gid` cookie safely (Firefox: Storage → Cookies; Chrome and Edge: Application → Cookies).
2. **Profile page:** header card (display name, MR badge with a progress ring), stat tiles (items mastered, points, points to next MR, completion %), and tabbed item grids (Warframes, Primary, Secondary, Melee, Companions, Archwing, Necramechs, Other). Each item shows a rank badge R0 to R30 and mastered state, with a manual override.
3. **Next up:** the cheapest unmastered items by remaining XP, filtered by the MR requirement.
4. **Filters and search:** mastered or not, name search (keyboard shortcut "/"), and sort by points, MR requirement, or closeness to done.
5. **Share links:** "Copy share link" encodes a trimmed, compressed snapshot (lz-string) into the URL hash. Opening such a link shows a read-only profile with a banner. No server storage.
6. **Exports:** Markdown for Obsidian (`- [x]` and `- [ ]` grouped by category, YAML front matter) and JSON.
7. **Settings:** theme toggle, manual inputs, and "delete my data".

## 6. UI and design direction
- Dark, premium sci-fi look inspired by Warframe's Orbiter: near-black navy background (#0a0d14) with a subtle gradient mesh, glassmorphism cards with 1px translucent borders, a teal/cyan accent (#35e0d0) and a gold colour for mastered states.
- Typography: Inter for UI text, Rajdhani or Orbitron for headings and numbers, with tabular numerals.
- Item cards with image, a glowing ring for state (grey, partial, gold), hover lift, and soft glow.
- Animated count-up on stats, smooth progress bars, and Framer Motion transitions. Respect `prefers-reduced-motion`. Use skeleton loaders.
- Virtualised lists (about 1,100 items), mobile-first responsive layout, light theme, and WCAG AA contrast with full keyboard and screen-reader support.
- Friendly, illustrated empty, error and throttled states with specific advice.

## 7. Tech stack
Vite, React, TypeScript (strict), Tailwind CSS, Zod for schemas, Framer Motion, lz-string, Vitest. Item data cached in IndexedDB.

## 8. Quality bar
- Unit tests for the mastery maths, XP-to-rank conversion, ID validation, the 12-hour cache TTL, the profile parser (with several fixtures including malformed ones), and share-link encode/decode.
- Dev mode runs on fixtures with no live requests by default.
- Lighthouse performance ≥ 90.
- No console errors, and no user data logged or transmitted.

## 9. Deployment (VPS + custom domain)
- The app is a static build (`vite build` → `dist/`). The VPS only serves static files, with no application server or database.
- Use Docker Compose with **Caddy** for automatic HTTPS on `https://<MY_DOMAIN>` (`www` redirects to the apex). DNS: A/AAAA records to the VPS IP.
- **Item data mirror (allowed, since it is not DE):** a small `data-sync` container downloads WFCD's `All.json` daily, trims it to the fields the app needs, gzips it, and writes it to a shared volume served at `/data/items.json`. The app loads from my domain first and falls back to GitHub raw. Add ETag and `Cache-Control: public, max-age=3600`.
- Files to produce: `Dockerfile` (multi-stage: node build, then caddy:alpine), `docker-compose.yml` (`web` + `data-sync`, `restart: unless-stopped`), `Caddyfile`, `deploy.sh`, and `.github/workflows/deploy.yml` (test, build, then deploy via SSH with a dedicated deploy user and repository secrets).
- Caddyfile requirements: SPA fallback to `index.html`, gzip/zstd, `immutable` caching for hashed assets, a short cache for `index.html`, and security headers (CSP allowing `connect-src 'self' https://api.warframe.com https://raw.githubusercontent.com` and no inline scripts, HSTS, nosniff, `Referrer-Policy: no-referrer`, a minimal Permissions-Policy).
- VPS hardening notes in the README: SSH keys only, a non-root user, ufw allowing only 22/80/443, fail2ban, unattended upgrades, and no privileged containers.
- Never configure the VPS to call DE's profile endpoint.

## 10. Deliverables and working method
1. Start with a short plan, the component tree, and a list of assumptions with how to verify each one.
2. Then build in small steps, running the tests after each feature.
3. Provide complete source code, plus a README covering local setup, build, first-time VPS setup, DNS, update and rollback procedures, and how to read logs.
4. Include `/about` (disclaimer and privacy statement) and a LICENSE (MIT).
5. If anything in this brief conflicts with what the real data shows, stop and tell me instead of guessing.