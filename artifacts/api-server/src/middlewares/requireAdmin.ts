import type { Request, Response, NextFunction } from "express";
import { db, usersTable, type User, type AdminPermission } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isAdminUser, isSuperAdminUser, hasPermission } from "../lib/admin";

// The authenticated admin user is attached here by requireAdmin.
type AdminRequest = Request & { userId?: number; adminUser?: User };

/**
 * Rejects requests from non-admins. On success attaches `req.userId` and
 * `req.adminUser` (the full row) so permission middlewares don't re-query.
 */
export async function requireAdmin(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session.userId;
  if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }
  if (!isAdminUser(user)) { res.status(403).json({ error: "Admin access required" }); return; }

  req.userId = userId;
  req.adminUser = user;
  next();
}

/** Requires the authenticated admin to be a super admin (manages other admins). */
export function requireSuperAdmin(req: AdminRequest, res: Response, next: NextFunction): void {
  if (!req.adminUser || !isSuperAdminUser(req.adminUser)) {
    res.status(403).json({ error: "Only the owner can do this" });
    return;
  }
  next();
}

/** Returns middleware requiring access to a specific admin section. */
export function requirePermission(perm: AdminPermission) {
  return (req: AdminRequest, res: Response, next: NextFunction): void => {
    if (!req.adminUser || !hasPermission(req.adminUser, perm)) {
      res.status(403).json({ error: `You don't have access to the ${perm} section` });
      return;
    }
    next();
  };
}
