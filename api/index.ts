/**
 * Vercel serverless entry point.
 *
 * The Express app is loaded lazily via dynamic import inside a try/catch so
 * that if initialization fails, we surface the REAL error in the response
 * instead of an opaque FUNCTION_INVOCATION_FAILED. `vercel.json` rewrites every
 * `/api/*` request here, and the Express app (mounted under `/api`) handles the
 * original URL.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

let appPromise: Promise<(req: IncomingMessage, res: ServerResponse) => void> | null = null;

function loadApp() {
  if (!appPromise) {
    appPromise = import("../artifacts/api-server/src/app").then((m) => m.default as unknown as (
      req: IncomingMessage,
      res: ServerResponse,
    ) => void);
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err: unknown) {
    const e = err as { message?: string; stack?: string };
    console.error("[api] Initialization failed:", err);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: "API initialization failed",
        message: String(e?.message ?? err),
        stack: typeof e?.stack === "string" ? e.stack.split("\n").slice(0, 10) : undefined,
      }),
    );
  }
}
