/**
 * Vercel serverless entry point.
 *
 * Vercel turns this file into a single Node serverless function. `vercel.json`
 * rewrites every `/api/*` request to it, and the Express app (which mounts all
 * routes under `/api`) handles the original URL. An Express app instance is
 * itself a `(req, res)` handler, so exporting it as default is all Vercel needs.
 *
 * Local development still uses `artifacts/api-server/src/index.ts` (app.listen);
 * this file is only used by Vercel.
 */
import app from "../artifacts/api-server/src/app";

export default app;
