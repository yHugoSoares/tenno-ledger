## Deployment (VPS + custom domain), replaces the GitHub Pages / Vercel steps

### Architecture
- The app stays a static build (`vite build` → `dist/`). The VPS only serves static files. No application server, no database.
- Serve with **Caddy** (automatic HTTPS) inside Docker Compose. Nginx + certbot is an acceptable alternative, but Caddy is the default.
- Domain: `https://<MY_DOMAIN>` (and `www` redirecting to the apex). DNS: A/AAAA records pointing to the VPS IP.
- DO NOT add any proxy, relay or serverless function for `api.warframe.com`. Profile fetches happen only from the visitor's browser.

### Item data mirror (allowed, since it is not DE's API)
- A small cron job or Caddy-adjacent container downloads `https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/All.json` once per day, trims it to the fields the app needs (`uniqueName, name, category, type, masterable, masteryReq, imageName`), gzips it, and writes it to `/srv/data/items.json`.
- The app loads `/data/items.json` from my domain (same origin), with a fallback to the GitHub raw URL. Cache headers: `Cache-Control: public, max-age=3600`, plus an ETag.
- Item images: use the CDN path from the item data, with a placeholder on failure. Do not hotlink in a way that breaks if it is unavailable.

### Files to produce
1. `Dockerfile` (multi-stage: node build → caddy:alpine serving `/srv`).
2. `docker-compose.yml` with services `web` (Caddy) and `data-sync` (a tiny script on a daily schedule), a shared volume for `items.json`, restart policy `unless-stopped`.
3. `Caddyfile`:
   - automatic HTTPS for `<MY_DOMAIN>`, redirect `www`.
   - SPA fallback to `index.html`.
   - gzip/zstd, long cache for hashed assets (`immutable`), short cache for `index.html`.
   - security headers: `Content-Security-Policy` (allow `connect-src 'self' https://api.warframe.com https://raw.githubusercontent.com`; no inline scripts), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` minimal.
4. `deploy.sh`: build, `rsync` the output to the VPS (or `docker compose pull && up -d`), then a health check (`curl -fsS https://<MY_DOMAIN>/`).
5. `.github/workflows/deploy.yml`: on push to `main` run tests and build, then deploy via SSH using repository secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`). Use a dedicated deploy user.

### VPS hardening checklist (document in the README)
- Non-root user with SSH keys only, password login disabled.
- Firewall (ufw): allow 22, 80, 443 only. fail2ban for SSH.
- Automatic security updates (`unattended-upgrades`).
- Docker running without privileged containers, with read-only filesystem for `web` where possible.
- Backups are not needed for user data (there is none), but back up the Caddy config and the compose files.

### README must include
- Step-by-step: buy domain, DNS records, first-time VPS setup, clone, `docker compose up -d`, verify HTTPS.
- Update procedure and rollback (`git checkout <tag>` then redeploy).
- How to check logs (`docker compose logs -f web`).
- A privacy page and the "Not affiliated with Digital Extremes" disclaimer, served at `/about`.
- A note that a shared VPS IP must never call DE's profile endpoint.