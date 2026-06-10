# Mysha Enterprise — Vercel Deployment Guide

This deploys the **frontend (Vite SPA)** and the **API (Express)** together as a
single Vercel project. The frontend is served as static files; every `/api/*`
request is routed to one serverless function that runs the Express app. Because
they share one domain, session cookies work with no CORS configuration.

You will set up three external services, all with free tiers:

| Service | Purpose | Why |
|---|---|---|
| **Neon** | Cloud Postgres | Your DB is currently local-only; Vercel can't reach it. Neon is serverless-friendly. |
| **Upstash** | Redis | Real, shared rate limiting across serverless instances. |
| **Resend** | Email | Sends verification / password-reset codes over HTTPS (SMTP is blocked on Vercel). |

---

## 1. Prepare the code locally (one time)

From the repo root on your Windows machine:

```bash
pnpm install          # installs the new deps (helmet, resend, connect-pg-simple, zod, @upstash/*)
pnpm run typecheck    # confirm everything compiles
```

Commit the updated `pnpm-lock.yaml`.

---

## 2. Create the database (Neon)

1. Go to https://neon.tech and sign up (free).
2. Create a project (pick a region close to your customers).
3. Open **Connection Details** and copy the **Pooled connection** string
   (the host contains `-pooler`). It looks like:
   `postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
   Using the **pooled** string is important for serverless.
4. Push the database schema. Locally, temporarily set `DATABASE_URL` to the Neon
   string and run:
   ```bash
   pnpm --filter @workspace/db run push
   ```
   This creates the `users`, `products`, `orders`, `verification_codes`, etc.
   tables in Neon. (The `user_sessions` table is created automatically at runtime.)
5. Seed your products/categories into Neon however you did locally.

---

## 3. Create rate-limit storage (Upstash)

1. Go to https://upstash.com and sign up (free).
2. Create a **Redis** database (global or a region near your Neon region).
3. From the database page, copy the **REST URL** and **REST Token**
   (the values labelled `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).

---

## 4. Create email sending (Resend)

1. Go to https://resend.com and sign up (free).
2. **API Keys → Create** and copy the key (`re_...`).
3. For now you can send from the shared test sender `onboarding@resend.dev`
   (leave `EMAIL_FROM` unset). Before real launch, verify your own domain in
   Resend and set `EMAIL_FROM` to e.g. `Mysha Enterprise <noreply@yourdomain.com>`.

---

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. Go to https://vercel.com → **Add New… → Project** → import the repo.
3. Vercel reads `vercel.json` automatically (build command, output dir, and the
   `/api` function are already configured). Leave the framework preset as-is.
4. Add **Environment Variables** (Settings → Environment Variables), for the
   Production environment:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | your Neon **pooled** connection string |
   | `SESSION_SECRET` | a long random string — generate with `openssl rand -base64 48` |
   | `RESEND_API_KEY` | your Resend key (`re_...`) |
   | `EMAIL_FROM` | *(optional)* `Mysha Enterprise <onboarding@resend.dev>` |
   | `UPSTASH_REDIS_REST_URL` | your Upstash REST URL |
   | `UPSTASH_REDIS_REST_TOKEN` | your Upstash REST token |
   | `ALLOWED_ORIGINS` | your final site URL, e.g. `https://your-app.vercel.app` |

   You do **not** need to set `NODE_ENV` (Vercel sets it to `production`) or
   `VERCEL` (set automatically) or `PORT`.
5. Click **Deploy**.

---

## 6. Verify after deploy

- Visit `https://<your-app>.vercel.app/api/healthz` → should return `{"status":"ok"}`.
- Load the site, sign up with a real email, and confirm the code arrives.
- Place a test order; confirm it appears in your order history and that visiting
  another order's URL (`/orders/<some-other-id>`) returns "not found".
- In Upstash, you should see rate-limit keys appear under traffic.

---

## Notes & gotchas

- **First deploy may surface bundling tweaks.** The API function bundles the
  Express app and the workspace packages. If a deploy fails on a module
  resolution error, that's the place to look — send me the error.
- **`ALLOWED_ORIGINS`** must exactly match your real domain(s), comma-separated,
  or browsers will block API calls in production.
- **Custom domain:** once you add one in Vercel, update `ALLOWED_ORIGINS` (and
  your Resend `EMAIL_FROM` domain) to match.
- **Free-tier cold starts:** the first request after idle is slower while the
  function spins up. Normal for serverless.
