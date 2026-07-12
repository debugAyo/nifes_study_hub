# NIFES Study Hub — Session Summary

**Date:** 2026-07-08
**Goal:** Make the project production-ready (security, deployment config, polish)

---

## What Was Done

### 1. Backend Security (`server/`)

| File | Change |
|------|--------|
| `server/middleware/auth.js` | **NEW** — JWT auth middleware. Validates Supabase session token on every API call before allowing the request. Returns 401 if no token or invalid token. |
| `server/index.js` | Added `helmet` (security headers), restricted CORS (only allowed origins), `express-rate-limit` (100 requests per 15 min general, 20 extractions per hour), 10mb JSON body limit |
| `server/routes/extract.js` | Auth middleware applied to both routes. Input validation (max 100 questions/batch, valid level, non-empty questions). Sanitized error messages (no stack leaks). Removed `SUPABASE_ANON_KEY` fallback — now requires `SUPABASE_SERVICE_KEY` for inserts. |
| `server/.env` | Added `CORS_ORIGIN` config |
| `server/.env.example` | Updated to match new config |
| `server/package.json` | Added `helmet` + `express-rate-limit` dependencies |

### 2. Frontend Config (`app/`)

| File | Change |
|------|--------|
| `app/js/config.js` | `SERVER_URL` now auto-detects localhost vs production using `window.location.hostname`. When deployed, uses production backend URL. |
| `app/js/db.js` | Added `dbGetAuthToken()` helper — reads the current Supabase session token from `supabaseClient.auth.getSession()` |
| `app/js/app.js` | PDF extraction `fetch()` call now includes `Authorization: Bearer <token>` header so the backend auth middleware accepts it |

### 3. Loading States

| File | Change |
|------|--------|
| `app/index.html` | Added loading overlay (`#loadingOverlay`) with spinner + "Loading your study hub…" text, shown during initial auth page load |
| `app/css/styles.css` | Added `.spinner-lg` (32px) and `.loading-overlay` (fullscreen overlay with transition) CSS classes |
| `app/js/app.js` | Added `showPageLoading()` / `hidePageLoading()` for the overlay. Added `showContainerLoading()` for inline spinner in containers. Applied to `hideAuthPage()` (initial load) and `renderAdminUsers()` (users table). |

### 4. Deployment Configuration

| File | Change |
|------|--------|
| `vercel.json` | **NEW** — Vercel config with SPA rewrites (`/app/*` → `/app/$1`, everything else → `/index.html`) and security headers |
| `scripts/inject-env.js` | **NEW** — Build-time script that reads `config.template.js`, replaces `__SUPABASE_URL__`, `__SUPABASE_ANON_KEY__`, `__SERVER_URL__` placeholders with environment variables, and writes `config.js` |
| `app/js/config.template.js` | **NEW** — Template file with placeholder values for env var injection. Also has the `window.location.hostname` auto-detect logic for `SERVER_URL` |
| `package.json` (root) | **NEW** — Root package.json with `build` script that runs `inject-env.js` |

### 5. Polish / Cleanup

| File | Change |
|------|--------|
| `nifes-study-hub.html` | **DELETED** — Orphaned duplicate prototype |
| `error.txt` | **DELETED** — Debug log file accidentally committed |
| `404.html` | **NEW** — Custom 404 page with "Go to Study Hub" button |
| `favicon.svg` | **NEW** — SVG favicon matching the NIFES logo |
| `app/index.html` | Added `<link rel="icon">` to favicon |
| `index.html` (landing) | Added `<link rel="icon">` to favicon |
| `app/js/app.js` | Fixed pagination bug: `pqPage` now resets to 1 when switching levels |
| `app/js/app.js` | Fixed material upload file type mismatch: JS validation now accepts DOC, DOCX, PPT, PPTX, TXT (matching HTML accept attribute) |
| `.gitignore` | Added `error.txt`, `prompt.txt` |

### 6. Additional Fixes

| File | Change |
|------|--------|
| `server/index.js` | Removed unused `requireAuth` import (auth is applied in `routes/extract.js` instead) |
| `server/index.js` | Added `/favicon.ico` route returning 204 to suppress browser 404 logs |
| `app/js/app.js` | Fixed quiz filter: questions without answers now appear in CBT practice (uploaded PQs were excluded) |
| `app/js/app.js` | Fixed `extractMCQ` calls: now passes question object instead of answer string |
| `app/js/app.js` | Quiz shows "Answer not provided yet." for questions without answers |
| `app/js/app.js` | MCQ highlight only marks correct answer when one is known |
| `app/js/seed.js` | `extractMCQ` now returns options even when correct answer is empty |
| `app/js/app.js` | Added level + search filters to Materials Library view |
| `app/index.html` | Added level dropdown and search input to Materials Library |
| `app/css/styles.css` | Added `.filter-input` style |

---

## What's Remaining (To Do)

### Before You Can Deploy

- [ ] **Get your Supabase Service Role Key**
  - Go to Supabase Dashboard → Settings → API → `service_role` key
  - Add it to `server/.env` as `SUPABASE_SERVICE_KEY=your-key-here`
  - This is needed because the server's batch insert bypasses RLS

### Deployment Steps

#### Step 1: Deploy the Backend (Railway or Render)

- [ ] Push the `server/` folder (or entire repo) to GitHub
- [ ] Create a new project in [Railway](https://railway.app) or [Render](https://render.com)
- [ ] Connect your GitHub repo
- [ ] Set these environment variables in the dashboard:
  - `SUPABASE_URL` = `https://inkclvlcajkyeigridkk.supabase.co`
  - `SUPABASE_ANON_KEY` = `<your-anon-key>`
  - `SUPABASE_SERVICE_KEY` = `<your-service-role-key>`
  - `CORS_ORIGIN` = `https://nifes-study-hub.vercel.app`
  - `PORT` = `3001`
- [ ] Wait for deployment, note the URL (e.g. `https://nifes-study-hub-server.up.railway.app`)

#### Step 2: Update Backend URL in Config

- [ ] Open `app/js/config.js`
- [ ] Replace `https://nifes-study-hub-server.up.railway.app` with your actual deployed backend URL
- [ ] Also update the same placeholder in `app/js/config.template.js`

#### Step 3: Deploy the Frontend (Vercel)

- [ ] Push the entire repo to GitHub (if not already)
- [ ] Import the repo in [Vercel](https://vercel.com)
- [ ] Framework Preset: **Other**
- [ ] Build Command: (none)
- [ ] Output Directory: `.` (root)
- [ ] Add these environment variables in Vercel dashboard:
  - `SUPABASE_URL` = `https://inkclvlcajkyeigridkk.supabase.co`
  - `SUPABASE_ANON_KEY` = `<your-anon-key>`
  - `SERVER_URL` = `https://your-backend-url.com`
- [ ] Deploy

#### Step 4: Verify

- [ ] Visit your Vercel URL — landing page loads
- [ ] Sign up / Sign in works
- [ ] Dashboard shows questions
- [ ] Past questions load with pagination
- [ ] Quiz mode works
- [ ] Materials upload works
- [ ] PDF extraction works (test with deployed backend URL)
- [ ] Admin Panel shows for admin/superuser roles
- [ ] Profile shows correct role
- [ ] 404 page appears for unknown routes

---

## Files Changed (Summary)

```
NEW FILES:
  server/middleware/auth.js          — JWT auth middleware
  vercel.json                        — Vercel deployment config
  scripts/inject-env.js              — Env var injection script
  app/js/config.template.js          — Config template with placeholders
  404.html                           — Custom 404 page
  favicon.svg                        — SVG favicon
  package.json (root)                — Root package.json with build script

MODIFIED FILES:
  server/index.js                    — Helmet, CORS, rate limiting, favicon route, removed unused import
  server/routes/extract.js           — Auth middleware, input validation, sanitized errors
  server/.env                        — Added CORS_ORIGIN
  server/.env.example                — Updated template
  server/package.json                — Added helmet, express-rate-limit
  app/js/config.js                   — Dynamic SERVER_URL
  app/js/db.js                       — Added dbGetAuthToken()
  app/js/app.js                      — Auth header in fetch, loading states, pagination fix, file type mismatch fix, CBT quiz fix, material filters
  app/js/seed.js                     — extractMCQ returns options even without correct answer
  app/index.html                     — Added loading overlay, favicon, material library filters
  app/css/styles.css                 — Added spinner-lg, loading-overlay, filter-input styles
  index.html (landing)               — Added favicon
  .gitignore                         — Added error.txt, prompt.txt

DELETED FILES:
  nifes-study-hub.html               — Orphaned duplicate prototype
  error.txt                          — Debug log file
```
