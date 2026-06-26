# Deploy Mysha Enterprise to Render

I've added a **Blueprint** (`render.yaml`) that tells Render to create everything for you:
a Postgres database **and** a web service that builds your site, sets up the database tables,
loads the sample product, and serves the whole website + admin panel from one URL.

There are two account steps only you can do (they need your logins): **putting the code on
GitHub**, and **connecting it on Render**. Here's the easiest path — no command line required.

---

## Step 1 — Put the code on GitHub (using GitHub Desktop)

Render deploys from a GitHub repository, so the code needs to live on GitHub first.

1. Create a free account at https://github.com if you don't have one.
2. Download **GitHub Desktop**: https://desktop.github.com — install and sign in with your GitHub account.
3. In GitHub Desktop: **File → Add Local Repository** → choose the folder
   `Desktop/Maisha Enterprise/Mysha-Enterprise`.
   - If it says "this directory is not a Git repository," click **Create a Repository** (same dialog).
4. Click **Publish repository**. Choose **Private** (recommended), keep the name, and publish.

That uploads your code to GitHub. (The `.gitignore` already prevents the huge `node_modules`
folder from being uploaded.)

---

## Step 2 — Deploy on Render with the Blueprint

1. Create a free account at https://render.com — choose **Sign in with GitHub** so Render can see your repos.
2. In the Render dashboard click **New + → Blueprint**.
3. Select the repository you just published. Render finds `render.yaml` automatically.
4. Review the plan (it shows one web service + one free Postgres database) and click **Apply**.
5. Render now builds everything. The first build takes roughly **5–10 minutes**
   (installing, building the site, creating database tables, adding the sample product).
6. When it finishes, open the web service — its URL looks like
   `https://mysha-enterprise.onrender.com`. That's your live website.

---

## Step 3 — Become an admin and see the panel

1. On your live site, click **Sign up** and register using **ibnomarromel@gmail.com**
   (that email is already set as the admin in the Blueprint).
2. After signing in, an **Admin** icon appears in the top bar — or go to
   `https://YOUR-SITE.onrender.com/admin`.
3. Add, edit, and delete products there. Open the **Google Pixel 9 Pro XL** to see the new
   product-page design (gallery, color/storage selectors, spec table, EMI, WhatsApp).

---

## Making changes later

Whenever you (or I) change the code, open **GitHub Desktop**, click **Commit to main**, then
**Push origin**. Render automatically rebuilds and redeploys within a few minutes.

---

## Good to know about the free plan

- **First visit after idle is slow.** Free web services sleep after ~15 min of no traffic and take
  ~30–60 seconds to wake on the next visit. Paid plans stay always-on.
- **Free Postgres expires after ~90 days.** Fine for testing; upgrade or recreate later for production.
- **Your admin email and a generated session secret** are already configured by the Blueprint, so
  login works out of the box.

## If the build fails

Open the failed deploy in Render and copy the **build logs**, then send them to me — I'll read the
error and fix the code. The most likely thing to adjust is a platform-specific build dependency,
which is a quick change. Send me the log and I'll handle it.
