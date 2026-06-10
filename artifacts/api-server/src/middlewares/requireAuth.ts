import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that rejects unauthenticated requests.
 *
 * Reads the logged-in user id from the (httpOnly, signed) session cookie and
 * attaches it to `req.userId` for downstream handlers. Returns 401 when there
 * is no authenticated session.
 */
export function requireAuth(
  req: Request & { userId?: number },
  res: Response,
  next: NextFunction,
): void {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  req.userId = userId;
  next();
}
