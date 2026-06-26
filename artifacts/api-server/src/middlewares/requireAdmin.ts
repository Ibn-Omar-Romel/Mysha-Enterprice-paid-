import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAdminUser } from "../lib/admin";

/**
 * Express middleware that rejects requests from non-admin users.
 *
 * Loads the logged-in user from the session, verifies they are an admin (either
 * the DB `is_admin` flag or a match in ADMIN_EMAILS), and attaches `req.userId`.
 * Returns 401 when not signed in and 403 when signed in but not an admin.
 */
export async function requireAdmin(
  req: Request & { userId?: number },
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  if (!isAdminUser(user)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  req.userId = userId;
  next();
}
