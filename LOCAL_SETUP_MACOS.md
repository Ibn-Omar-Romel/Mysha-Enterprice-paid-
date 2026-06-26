# Run Mysha Enterprise locally on your Mac

Follow these once. You'll use the **Terminal** app (press ⌘+Space, type "Terminal", Enter).

## 1. Install the tools (one time)

**Node.js 22** and **pnpm**. If you don't have Homebrew, install it from https://brew.sh, then:
```
brew install node@22
npm install -g pnpm
```
Check they work:
```
node -v      # should print v22.x (or v20.19+)
pnpm -v
```

## 2. Get a database (one time)

The app needs PostgreSQL. The easiest option that also works on Render later is a **free cloud database from Neon** (https://neon.tech):

1. Sign up, create a project.
2. Copy the **connection string** (looks like `postgresql://user:pass@...neon.tech/dbname?sslmode=require`). Use the **pooled** one if offered.

Keep that string handy — it's your `DATABASE_URL`.

## 3. Install the project (one time)

In Terminal, go to the project folder and install:
```
cd "/Users/ibnomarromel/Desktop/Maisha Enterprise/Mysha-Enterprise"
pnpm install
```

## 4. Set up the database tables + sample product (one time)

Paste your real database string in the first line, then run all of these in the **same** Terminal window:
```
export DATABASE_URL="postgresql://PASTE-YOUR-NEON-STRING-HERE"
export ADMIN_EMAILS="ibnomarromel@gmail.com"
export PORT=8080

pnpm --filter @workspace/db push          # creates/updates the tables
pnpm --filter @workspace/db seed:sample    # adds the Pixel 9 Pro XL example
```
If `push` asks you to confirm changes, accept them. Your existing products are kept.

## 5. Start the app (every time you want to run it)

You need **two Terminal windows/tabs**.

**Terminal 1 — the API server.** In the same window as step 4 (so the `export` lines still apply), run:
```
pnpm --filter @workspace/api-server dev
```
Leave it running. It builds and serves the API on port 8080.

> If you opened a fresh Terminal, re-run the three `export` lines first, then the command above.

**Terminal 2 — the website.** Open a new tab (⌘+T), then:
```
cd "/Users/ibnomarromel/Desktop/Maisha Enterprise/Mysha-Enterprise"
pnpm --filter @workspace/mysha-enterprise dev
```
It prints a local URL — usually **http://localhost:5173**. Open that in your browser.

## 6. Become an admin and test

1. On the site, **Sign up** (or sign in) using `ibnomarromel@gmail.com` (the email you put in `ADMIN_EMAILS`).
2. You're now an admin — an **Admin** icon appears in the top bar, or go to **http://localhost:5173/admin**.
3. Click **Add New Product**, fill the form, save. It appears on the store immediately.
4. Open the Pixel 9 Pro XL to see the new product-page design (gallery, color/storage, spec table, EMI, WhatsApp).

To stop the app, press **Ctrl+C** in each Terminal.

## 7. When local looks good → Render

On Render you create:
- a **PostgreSQL** instance (or reuse the same Neon database), and
- a **Web Service** pointing at this repo with:
  - **Build command:** `pnpm install && pnpm build`
  - **Start command:** `pnpm --filter @workspace/api-server start`
  - **Environment variables:** `DATABASE_URL`, `PORT` (Render provides one — the app reads it), `SESSION_SECRET` (a long random string), `ADMIN_EMAILS=ibnomarromel@gmail.com`, `NODE_ENV=production`.

After the first deploy, run the table setup once against the production database (`pnpm --filter @workspace/db push` with the production `DATABASE_URL`). On Render the same server serves both the website and the API, so there's no extra config — it just works on one URL.

## Common hiccups

- **"DATABASE_URL must be set"** — you didn't run the `export DATABASE_URL=...` line in that Terminal window. Re-run the three `export` lines.
- **Blank page or "failed to fetch"** — make sure Terminal 1 (API) is still running on port 8080.
- **Admin icon missing** — sign in with the exact email in `ADMIN_EMAILS`; capitalization/spaces matter.
- **`pnpm: command not found`** — re-run `npm install -g pnpm`.
