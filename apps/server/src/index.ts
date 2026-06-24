import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@howlwheel/api/context";
import { publicRouter } from "@howlwheel/api/routers/index";
import { createDb } from "@howlwheel/db";
import { env } from "@howlwheel/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

/**
 * Public overlay API (Cloudflare Worker).
 *
 * Hosts the token-gated `publicRouter` (OBS overlays poll here). Operator
 * (protected) procedures live behind Cloudflare Access in the web app's
 * `/api/trpc` route, NOT here. See README → "Architecture".
 */
const app = new Hono();

app.use(logger());
app.use(
	"/*",
	cors({
		origin: env.CORS_ORIGIN,
		allowMethods: ["GET", "POST", "OPTIONS"],
	}),
);

app.use(
	"/trpc/*",
	trpcServer({
		router: publicRouter,
		createContext: (_opts, c) =>
			createContext({
				db: createDb(env.DB),
				headers: c.req.raw.headers,
				// No protected procedures are mounted here, so Access is irrelevant.
				access: { teamDomain: undefined, aud: undefined, disabled: false },
			}),
	}),
);

app.get("/", (c) => c.text("OK"));

export default app;
