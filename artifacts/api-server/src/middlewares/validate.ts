import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

/**
 * Returns middleware that validates `req.body` against the given Zod schema.
 *
 * On success the parsed (and coerced) value replaces `req.body`, so handlers
 * receive clean, typed data. On failure it responds 400 with field-level
 * details and never reaches the handler. This is the single choke-point that
 * prevents arbitrary/unvalidated input from reaching the database.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.flatten(),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
