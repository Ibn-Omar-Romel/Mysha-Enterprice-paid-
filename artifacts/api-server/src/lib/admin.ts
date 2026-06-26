import type { User } from "@workspace/db";

/**
 * Emails listed here (via the ADMIN_EMAILS env var, comma-separated) are treated
 * as admins automatically. This is the simplest way to grant yourself admin
 * access: set ADMIN_EMAILS to your account email, sign in, and you're an admin.
 *
 * The DB `is_admin` flag is the source of truth once set; this env list is an
 * additional always-on allow-list and is also used to auto-promote a matching
 * account the first time it signs in.
 */
export function adminEmailList(): string[] {
  return (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Whether the given user should be treated as an admin. */
export function isAdminUser(user: Pick<User, "email" | "isAdmin">): boolean {
  if (user.isAdmin) return true;
  return adminEmailList().includes(user.email.trim().toLowerCase());
}

/** Shape returned to the client for the authenticated user. */
export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    isAdmin: isAdminUser(user),
  };
}
