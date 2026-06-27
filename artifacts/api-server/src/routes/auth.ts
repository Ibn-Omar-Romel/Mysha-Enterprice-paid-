import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { usersTable, verificationCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { validateBody } from "../middlewares/validate";
import { adminEmailList, publicUser } from "../lib/admin";

/**
 * Persist is_admin=true the first time a user whose email is in ADMIN_EMAILS
 * signs in, so the flag becomes the source of truth even if the env list later
 * changes. Returns the (possibly updated) user.
 */
async function ensureAdminFlag(user: typeof usersTable.$inferSelect) {
  const isOwner = adminEmailList().includes(user.email.trim().toLowerCase());
  if (!isOwner) return user;
  // Owner accounts are full super admins.
  if (user.isAdmin && user.isSuperAdmin) return user;
  const [updated] = await db
    .update(usersTable)
    .set({ isAdmin: true, isSuperAdmin: true })
    .where(eq(usersTable.id, user.id))
    .returning();
  return updated ?? user;
}

const router = Router();

// ─── Validation schemas ─────────────────────────────────────────────────────
const emailField = z.string().trim().toLowerCase().email().max(254);
const codeField = z.string().trim().regex(/^\d{6}$/, "Code must be 6 digits");
const passwordField = z.string().min(8).max(200);

const signupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailField,
  password: passwordField,
});
const signinSchema = z.object({ email: emailField, password: z.string().min(1).max(200) });
const emailOnlySchema = z.object({ email: emailField });
const verifyCodeSchema = z.object({ email: emailField, code: codeField });
const resetPasswordSchema = z.object({ email: emailField, code: codeField, newPassword: passwordField });

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function codeExpiry(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 15);
  return d;
}

async function sendVerificationEmail(to: string, code: string, type: "signup" | "reset") {
  const subject = type === "signup"
    ? "Verify your Mysha Enterprise account"
    : "Reset your Mysha Enterprise password";

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="text-align:center;margin-bottom:24px">
        <div style="display:inline-block;background:#f97316;color:#fff;font-weight:bold;font-size:20px;padding:10px 18px;border-radius:8px">M</div>
        <span style="font-size:22px;font-weight:bold;margin-left:8px">Mysha<span style="color:#f97316">Enterprise</span></span>
      </div>
      <h2 style="color:#111;margin-bottom:8px">${type === "signup" ? "Confirm your email" : "Reset your password"}</h2>
      <p style="color:#555;margin-bottom:24px">Use this code to ${type === "signup" ? "verify your account" : "reset your password"}. It expires in 15 minutes.</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
        <p style="font-size:40px;font-weight:bold;letter-spacing:12px;color:#f97316;margin:0">${code}</p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;

  // Send via Resend's HTTP API. EMAIL_FROM defaults to Resend's shared test
  // sender, which can only deliver to your own Resend account address until you
  // verify a domain.
  const apiKey = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"] || "Mysha Enterprise <onboarding@resend.dev>";

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({ from, to, subject, html });
      if (error) throw new Error(error.message ?? "Email send failed");
      // Email delivered. Hide the code (unless explicitly exposed for testing).
      return process.env["SHOW_VERIFICATION_CODE"] === "true" ? code : null;
    } catch (err) {
      // Email could not be delivered — most commonly because Resend's test
      // sender only delivers to your own address until you verify a domain.
      // Fall back to returning the code so sign-up still works. Once you verify
      // a sending domain in Resend, real emails go out and this stops happening.
      console.error("[auth] Email send failed; returning code to client instead:", err);
      return code;
    }
  }

  // No email provider configured at all → return the code so the flow works.
  return code;
}

router.post("/auth/signup", validateBody(signupSchema), async (req, res) => {
  const { name, email, password } = req.body as z.infer<typeof signupSchema>;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, verified: false }).returning();

  const code = generateCode();
  await db.insert(verificationCodesTable).values({
    email,
    code,
    type: "signup",
    expiresAt: codeExpiry(),
  });

  const devCode = await sendVerificationEmail(email, code, "signup");
  req.log.info({ email }, "Signup verification code sent");

  res.json({ message: "Account created. Check your email for the verification code.", devCode });
});

router.post("/auth/verify-email", validateBody(verifyCodeSchema), async (req, res) => {
  const { email, code } = req.body as z.infer<typeof verifyCodeSchema>;

  const [record] = await db
    .select()
    .from(verificationCodesTable)
    .where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, code),
        eq(verificationCodesTable.type, "signup"),
        eq(verificationCodesTable.used, false),
        gt(verificationCodesTable.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!record) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }

  await db.update(verificationCodesTable).set({ used: true }).where(eq(verificationCodesTable.id, record.id));
  const [verifiedUser] = await db.update(usersTable).set({ verified: true }).where(eq(usersTable.email, email)).returning();
  const user = await ensureAdminFlag(verifiedUser);

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post("/auth/resend-code", validateBody(emailOnlySchema), async (req, res) => {
  const { email } = req.body as z.infer<typeof emailOnlySchema>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) { res.status(404).json({ error: "No account found with this email" }); return; }

  await db.update(verificationCodesTable).set({ used: true })
    .where(and(eq(verificationCodesTable.email, email), eq(verificationCodesTable.type, "signup")));

  const code = generateCode();
  await db.insert(verificationCodesTable).values({ email, code, type: "signup", expiresAt: codeExpiry() });

  const devCode = await sendVerificationEmail(email, code, "signup");
  res.json({ message: "Verification code resent", devCode });
});

router.post("/auth/signin", validateBody(signinSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof signinSchema>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const signedInUser = await ensureAdminFlag(user);
  req.session.userId = signedInUser.id;
  res.json({ user: publicUser(signedInUser) });
});

router.post("/auth/signout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Signed out" });
  });
});

router.get("/auth/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [found] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!found) { res.status(401).json({ error: "User not found" }); return; }

  const user = await ensureAdminFlag(found);
  res.json({ user: publicUser(user) });
});

router.post("/auth/forgot-password", validateBody(emailOnlySchema), async (req, res) => {
  const { email } = req.body as z.infer<typeof emailOnlySchema>;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.json({ message: "If an account exists, a reset code has been sent" });
    return;
  }

  await db.update(verificationCodesTable).set({ used: true })
    .where(and(eq(verificationCodesTable.email, email), eq(verificationCodesTable.type, "reset")));

  const code = generateCode();
  await db.insert(verificationCodesTable).values({ email, code, type: "reset", expiresAt: codeExpiry() });

  const devCode = await sendVerificationEmail(email, code, "reset");
  req.log.info({ email }, "Password reset code sent");

  res.json({ message: "If an account exists, a reset code has been sent", devCode });
});

router.post("/auth/verify-reset-code", validateBody(verifyCodeSchema), async (req, res) => {
  const { email, code } = req.body as z.infer<typeof verifyCodeSchema>;

  const [record] = await db
    .select()
    .from(verificationCodesTable)
    .where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, code),
        eq(verificationCodesTable.type, "reset"),
        eq(verificationCodesTable.used, false),
        gt(verificationCodesTable.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!record) { res.status(400).json({ error: "Invalid or expired reset code" }); return; }
  res.json({ valid: true });
});

router.post("/auth/reset-password", validateBody(resetPasswordSchema), async (req, res) => {
  const { email, code, newPassword } = req.body as z.infer<typeof resetPasswordSchema>;

  const [record] = await db
    .select()
    .from(verificationCodesTable)
    .where(
      and(
        eq(verificationCodesTable.email, email),
        eq(verificationCodesTable.code, code),
        eq(verificationCodesTable.type, "reset"),
        eq(verificationCodesTable.used, false),
        gt(verificationCodesTable.expiresAt, new Date()),
      )
    )
    .limit(1);

  if (!record) { res.status(400).json({ error: "Invalid or expired reset code" }); return; }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.email, email));
  await db.update(verificationCodesTable).set({ used: true }).where(eq(verificationCodesTable.id, record.id));

  res.json({ message: "Password reset successfully" });
});

export default router;
