import "express-session";

// Tell TypeScript that our session can carry a logged-in user id. This lets us
// use `req.session.userId` directly with full type-safety instead of casting
// the session to a loose record type.
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}
