import type { User } from "@workspace/db";
import { ADMIN_PERMISSIONS, type AdminPermission } from "@workspace/db";

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

/** Super admins (the owner) can manage other admins and have every permission. */
export function isSuperAdminUser(user: Pick<User, "email" | "isSuperAdmin">): boolean {
  if (user.isSuperAdmin) return true;
  return adminEmailList().includes(user.email.trim().toLowerCase());
}

/** The effective permission list for a user (super admins get all). */
export function effectivePermissions(user: User): AdminPermission[] {
  if (isSuperAdminUser(user)) return [...ADMIN_PERMISSIONS];
  return Array.isArray(user.permissions) ? user.permissions : [];
}

/** True if the user may access a given admin section. */
export function hasPermission(user: User, perm: AdminPermission): boolean {
  return isSuperAdminUser(user) || (Array.isArray(user.permissions) && user.permissions.includes(perm));
}

/** Shape returned to the client for the authenticated user. */
export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    verified: user.verified,
    isAdmin: isAdminUser(user),
    isSuperAdmin: isSuperAdminUser(user),
    permissions: effectivePermissions(user),
  };
}
