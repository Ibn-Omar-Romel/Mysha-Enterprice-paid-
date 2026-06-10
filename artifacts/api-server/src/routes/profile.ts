import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { usersTable, profileTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { validateBody } from "../middlewares/validate";

const router = Router();

// ─── Validation ───────────────────────────────────────────────────────────────
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(30).optional(),
  avatar: z.string().trim().max(500000).nullable().optional(),
  address: z.unknown().optional(),
});

// ─── Get user + supplemental profile ─────────────────────────────────────────
// The profile table has NO userId column — it was originally a single shared
// row.  We match it by email (users.email === profile.email).
// If no row exists yet we create one seeded from users table.
async function getOrCreateProfileForUser(userId: number) {
  // 1. Load the canonical user record
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) return null;

  // 2. Find supplemental row by email
  const rows = await db
    .select()
    .from(profileTable)
    .where(eq(profileTable.email, user.email))
    .limit(1);

  if (rows.length > 0) {
    return { user, profile: rows[0]! };
  }

  // 3. Create supplemental row on first access
  const [created] = await db
    .insert(profileTable)
    .values({
      name: user.name,
      email: user.email,
      phone: "",
      avatar: null,
      address: null,
    })
    .returning();

  return { user, profile: created! };
}

function formatProfile(
  user: typeof usersTable.$inferSelect,
  profile: typeof profileTable.$inferSelect
) {
  return {
    id: user.id,
    name: user.name || profile.name || "User",
    email: user.email || profile.email,
    phone: profile.phone || "",
    avatar: profile.avatar ?? null,
    address: profile.address ?? null,
    joinedAt:
      user.createdAt?.toISOString() ??
      profile.joinedAt?.toISOString() ??
      new Date().toISOString(),
  };
}

// ─── GET /api/profile ─────────────────────────────────────────────────────────
router.get("/profile", requireAuth, async (req: any, res: any) => {
  try {
    const result = await getOrCreateProfileForUser(req.userId);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(formatProfile(result.user, result.profile));
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ─── PUT /api/profile ─────────────────────────────────────────────────────────
router.put("/profile", requireAuth, validateBody(updateProfileSchema), async (req: any, res: any) => {
  try {
    const result = await getOrCreateProfileForUser(req.userId);
    if (!result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { name, email, phone, avatar, address } = req.body;

    // Update supplemental profile row
    const profileUpdates: Partial<typeof profileTable.$inferInsert> = {};
    if (phone !== undefined) profileUpdates.phone = phone;
    if (avatar !== undefined) profileUpdates.avatar = avatar;
    if (address !== undefined) profileUpdates.address = address;
    if (name !== undefined) profileUpdates.name = name;
    if (email !== undefined) profileUpdates.email = email;

    let updatedProfile = result.profile;
    if (Object.keys(profileUpdates).length > 0) {
      const [p] = await db
        .update(profileTable)
        .set(profileUpdates)
        .where(eq(profileTable.id, result.profile.id))
        .returning();
      if (p) updatedProfile = p;
    }

    // Update canonical users row
    const userUpdates: Partial<typeof usersTable.$inferInsert> = {};
    if (name !== undefined) userUpdates.name = name;
    if (email !== undefined) userUpdates.email = email;

    let updatedUser = result.user;
    if (Object.keys(userUpdates).length > 0) {
      const [u] = await db
        .update(usersTable)
        .set(userUpdates)
        .where(eq(usersTable.id, req.userId))
        .returning();
      if (u) updatedUser = u;
    }

    res.json(formatProfile(updatedUser, updatedProfile));
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
