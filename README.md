# Tenno Ledger

A free, open-source **Warframe mastery tracker**. Load your public profile and see
what you have mastered, what is missing, how many mastery points you have, and the
cheapest items to level next.

> **Unofficial fan project.** Not affiliated with, endorsed by, or sponsored by
> Digital Extremes. Warframe and all related assets are trademarks of Digital
> Extremes. See [LICENSE](LICENSE) (MIT).

---

## Why this project is built the way it is

Digital Extremes' profile endpoint (`api.warframe.com`) throttles by **IP address**,
and the game client uses the same endpoint. If a server fetched profiles on behalf
of visitors, its IP would be blocked quickly — and a blocked IP can stop real
players from logging in.

So the architecture is deliberately boring:

| Concern | Decision |
| --- | --- |
| Profile data | Fetched **by the visitor's browser**, or pasted as JSON. Never proxied, relayed, cached, or scheduled by our server. |
| Storage | `localStorage` (trimmed profile, manual progress, overrides, theme) + IndexedDB (item cache). No database. |
| Hosting | Static files only (`vite build` → `dist/`), served by Caddy in Docker. |
| Item data | A daily mirror of the community **WFCD `warframe-items`** dataset. This is not DE's API. |
| Accounts | None. |
| Analytics | None. |
| Share links | A compressed snapshot in the URL **fragment** (`#s=…`). Fragments are never sent to the server. |

There is no application server, no serverless function, and no proxy for
`api.warframe.com` anywhere in this repository.

---

## Quick start (local)

Requirements: **Node 22+** and npm.

```bash
npm install
npm run sync:items     # downloads the WFCD item mirror into public/data/
npm run sync:mission-data # refreshes the community Star Chart mastery map
npm run dev            # http://localhost:5173
```

Other scripts:

```bash
npm run build          # type-check, then build to dist/
npm run preview        # serve dist/ locally
npm run typecheck      # tsc --noEmit
npm run test           # vitest run (65 unit tests)
npm run test:watch     # vitest in watch mode
npm run sync:items     # refresh public/data/items.json + .gz
npm run sync:mission-data # refresh src/data/node-mastery.json
```

`sync:items` accepts flags if you need a different source or destination:

```bash
node scripts/sync-items.mjs --out public/data/items.json \
  --base https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json
```

The app loads `/data/items.json` from its own origin first. If that fails it
falls back to the GitHub raw files, and if those fail it uses the last copy cached
in IndexedDB.

---

## Using the site

1. **Get your player ID.** It is the `gid` cookie on `warframe.com`: a
   **24-character hexadecimal** public identifier. The landing page has a
   step-by-step guide for Firefox and Chrome/Edge.
   **Never share login cookies** (`session`, `remember-me`, `XSRF`) with anyone.
2. **Load it** either by pasting the profile JSON or by pressing *Fetch from my
   browser*. Both happen on your device. Direct fetch may be blocked by CORS or
   throttling; pasting always works.
3. **Read the ledger.** Mastery points, completion, the next rank, per-item ranks,
   and a "Next up" list filtered to items your current MR can equip.
4. **Fill the gaps.** Mission completions, junctions, and intrinsic ranks are read
   from the profile when available. Settings retains an extra/manual Star Chart
   fallback for older or incomplete profile formats.
5. **Share or export.** Copy a read-only share link, download Markdown (Obsidian
   front-matter + checklists), or download a full JSON snapshot.

A successful browser fetch is cached for **12 hours** and direct fetches are locked
for the same period, so the endpoint is never hammered.

### Per-item overrides

If a profile is out of date, each item card has an override: **Auto**, **Mastered**,
or **Not mastered**. Overrides live only in your browser and are included in share
links and exports.

---

## Mastery maths (and what is verified)

* Rank `N` requires `2,500 × N²` mastery points. MR 18 = 810,000.
* Affinity is quadratic, not linear: normal weapons require `500 × rank²`
  affinity; Warframes, companions, and Archwings require `1,000 × rank²`.
* **Weapons** (including Sentinel weapons, Zaw strikes, Kitgun chambers): 3,000
  points at rank 30 = 450,000 affinity.
* **Warframes, companions, Archwings, K-Drives**: 6,000 points at rank 30 =
  900,000 affinity.
* **Necramechs**: 6,000 by rank 30 plus 2,000 from ranks 31–40 = **8,000** at rank
  40 (200 points per level after 30).
* **Kuva, Tenet, Coda weapons and Paracesis**: reach rank 40, but mastery stops at
  rank 30 (3,000 points). The UI shows the real rank and caps the points.
* **Junctions**: 1,000 each. **Intrinsic ranks**: 1,500 each.
* **Star Chart missions**: the client reads the profile's `Missions` array and
  counts only first completions. The current verified node map totals 14,569
  points; junctions add 13,000.

### Data notes from the live endpoints

These were checked before the app was built and are documented so future
maintainers know what changed:

* WFCD **no longer publishes `data/json/All.json`**. `scripts/sync-items.mjs`
  merges the per-category files (`Warframes.json`, `Primary.json`, …) and keeps only
  `masterable === true` entries. The current dataset yields **809 masterable items**
  (about 153 KiB raw, 17 KiB gzipped).
* Fields used: `uniqueName, name, category, type, masterable, masteryReq, imageName`.
* The profile endpoint is
  `https://api.warframe.com/cdn/getProfileViewingData.php?playerId=<24 hex>`.
  It responds with `Content-Type: text/html` even though the body is JSON, so the
  client reads text and then parses it.
* `XPInfo` normally lives at `Results[0].LoadOutInventory.XPInfo`. The parser also
  searches recursively, reports the top-level keys when it fails, and de-duplicates
  entries by keeping the highest XP.
* Operator Amp parts are marked `masterable: false` upstream, so they are excluded
  rather than invented.
* The profile's `Missions` entries include completion counts and tags such as
  `SolNode63` and `EarthToVenusJunction`. Duplicate/repeated completions are
  de-duplicated and do not award additional mastery.
* `PlayerSkills` fields beginning with `LPS_` are intrinsic ranks. Focus pools such
  as `LPP_DRIFTER` are not counted as intrinsic ranks.

---

## Deploying to a VPS

### Prerequisites

* A VPS with Docker Engine and the Compose plugin.
* DNS: `A`/`AAAA` records for `example.com` **and** `www.example.com` pointing at
  the VPS. Ports 80 and 443 open.
* Nothing else needs to run — no Node, no database.

### 1. Get the code onto the server

```bash
git clone https://github.com/yHugoSoares/tenno-ledger.git
cd tenno-ledger
cp .env.example .env
$EDITOR .env          # set DOMAIN, ACME_EMAIL, optionally VITE_GITHUB_URL
mkdir -p data
```

### 2. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f web
```

Caddy obtains and renews HTTPS certificates automatically. The first request may
take a few seconds while the certificate is issued.

### 3. Verify

```bash
curl -I https://example.com
curl -s https://example.com/data/items.json | head -c 200
```

You should see `HTTP/2 200`, security headers, and a JSON array of items.

### What runs

| Container | Role |
| --- | --- |
| `web` | Caddy serving `dist/` with SPA fallback, compression, long-lived asset caching, and security headers. |
| `data-sync` | Alpine + Node loop that writes `/srv/data/items.json(.gz)` every 24 h from the WFCD dataset. |

`./data` is mounted read-only into `web` and read-write into `data-sync`. The image
also ships a seed copy built during `docker build`, so the site works even before
the first sync finishes.

### Updating the site

```bash
git pull
docker compose up -d --build
```

To refresh item data immediately:

```bash
docker compose exec data-sync node /usr/local/bin/sync-items.mjs --out /srv/data/items.json
```

### Backups

Only `./data` and the Caddy volumes matter:

```bash
docker run --rm -v tenno-ledger_caddy_data:/data -v "$PWD/backup:/backup" alpine \
  tar czf /backup/caddy-data.tgz -C /data .
tar czf backup/items.tgz -C data .
```

### Rollback

```bash
git checkout <previous-tag-or-commit>
docker compose up -d --build
```

Because all user data lives in visitors' browsers, a rollback cannot lose profile
data. The only server-side state is the item mirror and TLS certificates.

---

## Project structure

```
src/
  lib/          pure logic: mastery maths, item classification, profile parsing,
                share encoding, exports, storage, IDB cache
  hooks/        small React hooks (item data, cooldown, share hash, hotkeys)
  state/        app state + toast providers
  components/   layout, header/footer, settings, item grid, charts, states
  pages/        landing, profile, about/privacy, 404
  fixtures/     demo profile + deterministic test data
scripts/
  sync-items.mjs  WFCD mirror builder (no DE endpoints)
Caddyfile         static hosting + SPA fallback + security headers
docker-compose.yml  web + data-sync
Dockerfile          multi-stage: Node build → Caddy runtime
```

---

## Privacy

* No accounts, no analytics, no tracking pixels, no third-party embeds.
* Profile JSON and IDs never reach the Tenno Ledger server.
* The only network calls from the page are: same-origin assets, the WFCD item
  mirror (or GitHub raw fallback), `cdn.warframestat.us` images, and — only if you
  press the button — `api.warframe.com`.
* Settings → **Delete my data** removes the cached profile, manual progress,
  overrides, theme, and the IndexedDB item cache.

The full statement lives on `/about#privacy`.

---

## Testing

```bash
npm test
```

65 unit tests cover quadratic affinity thresholds, rank-40 and Necramech caps,
mission and junction mastery, intrinsic parsing, overrides, manual points, item
classification, profile parsing (including nested and malformed responses), fetch
failure mapping (403/409/429, CORS, non-JSON), share encode/decode round-trips,
oversized links, and player ID validation.

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| *Fetch locked · 11h 59m* | A successful fetch is cached for 12 h by design. Paste JSON or open your cached profile. |
| *Digital Extremes is rate-limiting this IP* | The endpoint is throttling. Wait at least 12 hours; do not retry in a loop. Pasting JSON always works. |
| *The browser could not reach the endpoint* | Usually CORS. Paste the profile JSON instead. |
| *Could not find an XPInfo array* | The response was an error page or a changed format. Open *Technical details* to see the keys that were returned. |
| *Could not load the Warframe item database* | The mirror and the GitHub fallback both failed and there is no cached copy. Retry, or run `npm run sync:items`. |
| Demo button disabled | Item data is still loading, or it failed to load. |
| MR is lower than in-game | Add junctions, intrinsic ranks, and Star Chart points in Settings. |
| `docker compose` complains about `DOMAIN` | Copy `.env.example` to `.env` and set `DOMAIN`. |
| Certificate not issued | Check DNS for both apex and `www`, and that ports 80/443 are reachable. `docker compose logs web`. |

---

## Contributing

Data corrections, accessibility fixes, and tests are welcome. Please include the
item name, the expected value, and a source when reporting a data problem. **Do not
include profile JSON, player IDs, or cookies in a public issue.**

## License

MIT. Warframe, its assets, and its trademarks belong to Digital Extremes.
