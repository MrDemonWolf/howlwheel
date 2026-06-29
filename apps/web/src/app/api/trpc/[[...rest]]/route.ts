import { createContext } from "@howlwheel/api/context";
import { protectedRouter } from "@howlwheel/api/routers/index";
import { createDb } from "@howlwheel/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

/**
 * Operator API (protected). Served same-origin from the web app so the
 * Cloudflare Access cookie + `Cf-Access-Jwt-Assertion` header are present on
 * every request. Place this path AND `/control` behind a Cloudflare Access
 * application (see README → "Cloudflare Access").
 */
export const dynamic = "force-dynamic";

/** Bindings configured for the web Worker in `packages/infra/alchemy.run.ts`. */
type WebEnv = {
	DB: D1Database;
	CF_ACCESS_TEAM_DOMAIN?: string;
	CF_ACCESS_AUD?: string;
	ACCESS_DISABLED?: string;
	NEXT_PUBLIC_SERVER_URL?: string;
};

function handler(req: Request) {
	const env = getCloudflareContext().env as unknown as WebEnv;
	const db = createDb(env.DB);

	return fetchRequestHandler({
		endpoint: "/api/trpc",
		req,
		router: protectedRouter,
		createContext: () =>
			createContext({
				db,
				headers: req.headers,
				access: {
					teamDomain: env.CF_ACCESS_TEAM_DOMAIN,
					aud: env.CF_ACCESS_AUD,
					disabled: env.ACCESS_DISABLED === "true",
				},
			}),
	});
}

export { handler as GET, handler as POST };
