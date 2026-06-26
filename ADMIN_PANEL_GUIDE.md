# Mysha Enterprise — Admin Panel & New Product Page

This document explains what was added, how to switch it on, and how to use it. No coding required to follow it.

## What changed

**1. Admin panel (new).** A password-protected area where you add, edit and delete products. It lives at the `/admin` URL of your site. Only accounts you designate as admins can open it.

**2. Redesigned product page.** Every product page now shows an image gallery with thumbnails, the cash price with a strikethrough original price, availability and product code, selectable **Color** and **Storage** options (each storage option can have its own price), quantity, **Shop Now** and **Add To Cart** buttons, an **EMI Available / View Plans** panel, a **WhatsApp** button, a delivery timescale, and a full **Specification** table — matching the layout you asked for, in your own design.

**3. Database.** New fields were added to store all of the above (gallery images, colors, storage options with per-option price/stock, the spec table, product code, cash price, delivery time, etc.), plus an `is_admin` flag on user accounts.

## One-time setup (do this once)

You need three things running: the **database**, the **environment variables**, and then **build & start**. The project is a pnpm monorepo, so always use `pnpm`.

### 1. Install dependencies
From the project root:
```
pnpm install
```

### 2. Set environment variables
The API server reads these. Set them wherever you run the server (your host's dashboard, or a local `.env`). The important ones:

| Variable | Required | What it's for |
|---|---|---|
| `DATABASE_URL` | Yes | Your PostgreSQL connection string |
| `PORT` | Yes | Port the server listens on (e.g. `8080`) |
| `SESSION_SECRET` | Yes in production | A long random string (32+ chars) for login security |
| `ADMIN_EMAILS` | Yes (for admin) | Comma-separated emails that become admins. **Put your own account email here.** |
| `NODE_ENV` | Recommended | `production` when live |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional | Sending verification emails |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Optional | Rate limiting in production |

Example:
```
ADMIN_EMAILS=ibnomarromel@gmail.com
```

### 3. Update the database structure
This creates the new columns. From the project root:
```
pnpm --filter @workspace/db push
```
(If it asks to confirm changes, accept them. Existing products are kept.)

### 4. (Optional) Load the sample product
Adds the **Google Pixel 9 Pro XL** example so you can see the new design right away:
```
pnpm --filter @workspace/db seed:sample
```

### 5. Build and start
```
pnpm build
pnpm --filter @workspace/api-server start
```
On a host like Render, your build command is `pnpm install && pnpm build` and your start command is `pnpm --filter @workspace/api-server start`.

## How to become an admin

1. Make sure your email is in `ADMIN_EMAILS` (step 2 above).
2. Open your site and **sign up or sign in** with that exact email.
3. You're now an admin. An **Admin** icon appears in the top bar, or just go to `/admin` directly.

That's it — your account is automatically promoted the first time you sign in with an email listed in `ADMIN_EMAILS`.

## Using the admin panel

- Go to `/admin` (or click the Admin icon in the header).
- **Add New Product** opens a form with every field: name, brand, model, category, code, prices, images, colors, storage options, the specification table (pre-filled with the standard rows you used in your brief), delivery time, WhatsApp number and EMI toggle.
- **Images:** paste image URLs (e.g. `https://…`). The first one is the primary image; the rest become gallery thumbnails.
- **Storage options:** add rows like `16/128GB` with their own price, old price and stock. When a customer picks one, the price on the page updates.
- **Colors:** pick a swatch colour and name it (e.g. Rose Quartz).
- **Specifications:** fill in the value for each row; empty rows are ignored.
- Use the **pencil** to edit and the **trash** icon to delete a product. The **external-link** icon opens the live page.

## Good to know

- **Adding a product instantly publishes it** to the storefront — it appears in listings, search and on its own page.
- **The shopping cart records the product at its base price.** The color/storage a customer selects is shown on the page and included in the WhatsApp message, but per-variant pricing inside the cart/checkout is a possible future enhancement.
- **Security:** admin routes are protected on the server — a non-admin (or a logged-out visitor) cannot create, edit or delete products even if they know the URLs.

## Files added/changed (for your developer, if any)

- Database schema: `lib/db/src/schema/products.ts`, `lib/db/src/schema/users.ts`
- Seed script: `lib/db/scripts/seed-sample.ts`
- Backend: `artifacts/api-server/src/routes/admin.ts`, `middlewares/requireAdmin.ts`, `lib/admin.ts`, updated `routes/auth.ts`, `routes/products.ts`, `routes/index.ts`
- Frontend: redesigned `src/pages/product.tsx`; new `src/pages/admin/*`; `src/lib/admin.ts`; updated `App.tsx`, `components/layout/Header.tsx`, `hooks/useAuth.ts`
